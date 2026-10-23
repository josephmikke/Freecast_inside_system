// eslint-disable-next-line max-classes-per-file
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

import middy from '@middy/core';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../utils/in-memory-relation-repositories';
import CategoryMap from '../../../category/shared/CategoryMap';
import CategoryRepository from '../../../category/shared/CategoryRepository';
import HttpClientAdaptor from '../../../epg/shared/HttpClientAdaptor';
import { IHttpClient } from '../../../epg/shared/IHttpClient';
import GenreMap from '../../../genre/shared/GenreMap';
import GenreRepository from '../../../genre/shared/GenreRepository';
import LocationFactory from '../../../location/shared/LocationFactory';
import LocationRepository from '../../../location/shared/LocationRepository';
import Package from '../../../package/shared/Package';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import Provider from '../../../provider/shared/Provider';
import ProviderMap from '../../../provider/shared/ProviderMap';
import ProviderRepository from '../../../provider/shared/ProviderRepository';
import { MrssSubTitle } from '../../../shared/dto/MrssDto';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import { IngestVodInput, IngestVodState, MrssIngestionStatus } from '../../../shared/dto/vod/IngestDto';
import StorageAdaptor from '../../../shared/StorageAdaptor';
import StreamFactory from '../../../stream/shared/StreamFactory';
import StreamRepository from '../../../stream/shared/StreamRepository';
import EpisodeFactory from '../../episode/shared/EpisodeFactory';
import EpisodeRepository from '../../episode/shared/EpisodeRepository';
import IngestionFactory from '../../ingestion/shared/IngestionFactory';
import IngestionRepository from '../../ingestion/shared/IngestionRepository';
import MovieFactory from '../../movie/shared/MovieFactory';
import MovieRepository from '../../movie/shared/MovieRepository';
import SeriesFactory from '../../series/shared/SeriesFactory';
import SeriesRepository from '../../series/shared/SeriesRepository';
import { ITranscoder } from '../../shared/ITranscoder';
import MRSSParser from '../../shared/parser/MRSSParser';
import MrssPathAdaptor from '../../shared/parser/MrssPathAdaptor';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import IngestVodDomain from '../IngestVodDomain';

const TEST_TABLE_NAME = 'test-ingestVodStateMachineAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const uid = new UIDGenerator();

const providerMap = new ProviderMap(uid);
const providerRepository = new ProviderRepository(
  ddbClient,
  TEST_TABLE_NAME,
  providerMap,
);

const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(
  ddbClient,
  TEST_TABLE_NAME,
  platformMap,
);

const categoryMap = new CategoryMap(uid);
const categoryRepository = new CategoryRepository(
  ddbClient,
  TEST_TABLE_NAME,
  categoryMap,
);

const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(
  ddbClient,
  TEST_TABLE_NAME,
  packageFactory,
);

const genreMap = new GenreMap(uid);
const genreRepository = new GenreRepository(ddbClient, TEST_TABLE_NAME, genreMap);

const locationFactory = new LocationFactory(uid, packageRepository);
const locationRepository = new LocationRepository(
  ddbClient,
  TEST_TABLE_NAME,
  locationFactory,
);

const streamFactory = new StreamFactory(uid);
const streamRepository = new StreamRepository(
  ddbClient,
  TEST_TABLE_NAME,
  streamFactory,
);

const REELZ_FEED = 'https://d2d6fj119jntet.cloudfront.net/Jest/Reelz_MRSS_Freecast.xml';
const REELZ_FEED_FIXTURE = readFileSync(path.join(__dirname, 'assets/reelz-mrss.xml'), 'utf8');
// 1x1 transparent PNG
const THUMBNAIL_FIXTURE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/**
 * Serves the Reelz feed and its thumbnails from local fixtures. The live feed changes daily
 * and its thumbnails are 0.5-1.4MB each, downloaded once per thumbnail slot, which pushed the
 * INGEST tests past the jest timeout. Any other URL goes to the real client.
 */
class FixtureHttpClient implements IHttpClient<Response> {
  private readonly realClient = new HttpClientAdaptor();

  async get(url: string): Promise<Response> {
    if (url === REELZ_FEED) {
      return new Response(REELZ_FEED_FIXTURE, {
        status: 200,
        headers: { 'content-type': 'application/xml' },
      });
    }
    if (typeof url === 'string' && url.startsWith('https://reelz-mrss.s3.amazonaws.com/')) {
      return new Response(THUMBNAIL_FIXTURE, {
        status: 200,
        headers: { 'content-type': 'image/png' },
      });
    }
    return this.realClient.get(url);
  }
}

const httpClient = new FixtureHttpClient();
const distributorRepository = new InMemoryDistributorRepository();
const brandRepository = new InMemoryBrandRepository();

const episodeFactory = new EpisodeFactory(
  uid,
  streamRepository,
  'default/nothumbnail/thumbnail.png',
);
const episodeRepository = new EpisodeRepository(
  ddbClient,
  TEST_TABLE_NAME,
  episodeFactory,
);

const seriesFactory = new SeriesFactory(
  uid,
  providerRepository,
  platformRepository,
  categoryRepository,
  packageRepository,
  genreRepository,
  locationRepository,
  episodeRepository,
  distributorRepository,
  brandRepository,
  'default/nothumbnail/thumbnail.png',
);
const seriesRepository = new SeriesRepository(
  ddbClient,
  TEST_TABLE_NAME,
  seriesFactory,
);
const movieFactory = new MovieFactory(
  uid,
  providerRepository,
  platformRepository,
  categoryRepository,
  packageRepository,
  genreRepository,
  locationRepository,
  streamRepository,
  distributorRepository,
  brandRepository,
  'default/nothumbnail/thumbnail.png',
);
const movieRepository = new MovieRepository(
  ddbClient,
  TEST_TABLE_NAME,
  movieFactory,
);

const s3Client = new S3Client({});
const s3Mock = mockClient(s3Client);
const storage = new StorageAdaptor(s3Client, process.env.STORAGE_BUCKET!, uid);

class TestTranscoder implements ITranscoder {
  async transcode(
    _ingestionId: string,
    _entityId: string,
    _media: string,
    _url: string,
    isPrivate: boolean,
    _retries: number,
    _cuePoints?: string[] | undefined,
    _subtitles?: MrssSubTitle[] | undefined,
  ): Promise<boolean> {
    if (isPrivate) { throw new Error('Method not implemented.'); }
    return true;
  }
}

const mrssPath = new MrssPathAdaptor();
const mrssParser = new MRSSParser(httpClient, mrssPath);

const ingestionFactory = new IngestionFactory(uid);
const ingestionRepository = new IngestionRepository(
  ddbClient,
  TEST_TABLE_NAME,
  ingestionFactory,
);

const domain = new IngestVodDomain(
  mrssParser,
  episodeRepository,
  movieRepository,
  seriesRepository,
  new TestTranscoder(),
  httpClient,
  storage,
  ingestionRepository,
  'default/nothumbnail/thumbnail.png',
);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain, uid);

const handler = middy<IngestVodInput>().handler(async (
  event,
  context,
) => apiGatewayAdaptor.handler(event, context));

describe('Test IngestVod State Machine', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    s3Mock.reset();
    s3Mock.onAnyCommand().resolves({});

    await providerRepository.save(Provider.create({
      extId: 'provider-extId',
      name: 'Provider Reelz_SD',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      configuration: {},
      type: [ProviderContentType.CHANNELS],
      subscription: true,
      format: ProviderNumberFormat.INTEGER,
      enabled: true,
      mtSlug: 'prod_vod_Reelz',
    }, 'provider-id'));
    await packageRepository.save(Package.create({
      thumbnail: 'packages/packageid/thumbnail.png',
      default: false,
      description: 'This is a package',
      price: '6.99',
      type: PackageType.INTERNAL,
      revenueModel: RevenueModel.PAID,
      extId: 'reality-package',
      name: 'Reality',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 1,
    }, 'package-id'));
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe('Handling error case.', () => {
    it('Bad Request Body - type', async () => {
      const badRequest = {
        url: REELZ_FEED,
        mapping: {},
        isPrivate: false,
      };

      // @ts-ignore
      const response = await handler(badRequest, undefined);

      expect(response).toEqual({});
    });

    it('Bad Request Body - url', async () => {
      const badRequest = {
        type: IngestVodState.MAP_URL,
        mapping: {},
        isPrivate: false,
      };

      // @ts-ignore
      const response = await handler(badRequest, undefined);

      expect(response).toEqual({
        statusCode: 500,
        body: 'Error: Error: TypeError: Only absolute URLs are supported',
      });
    });

    it('Bad Request Body - mapping', async () => {
      const badRequest = {
        type: IngestVodState.MAP_URL,
        url: REELZ_FEED,
        mapping: {},
        isPrivate: false,
      };

      // @ts-ignore
      const response = await handler(badRequest, undefined);

      expect(response).toEqual({
        statusCode: 500,
        body: "Error: TypeError: Failed to execute 'evaluateXPath': xpathExpression must be a string or an element depicting an XQueryX DOM tree.",
      });
    });
  });

  describe('Test different EVENT type for ingestVod state machine', () => {
    // Reelz MRSS: same mapping as extra/reelzMrssIngest. No nextPage, so mapUrl returns the
    // single feed url without paginating.
    const reelzMapping = {
      root: '//channel/item',
      nextPage: '',
      guid: "*[name()='guid']/text()",
      extId: "*[name()='guid']/text()",
      title: "title | *[name()='media:title']/text()",
      description: "description | *[name()='media:description']/text()",
      asset: "*[name()='media:content'] ! map:merge(((@height|@width|@duration|@url) ! map{local-name(): string()}, @medium ! map{'type': string()}))",
      subtitle: "array { *[name()='media:group']/*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
      thumbnails: "array { *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
      pubDate: 'pubDate',
      seasonNum: "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text() else ''",
      episodeNum: "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text() else ''",
      type: "*[name()='xumo:episodic']/@type",
      seriesId: "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seriesId']/text() else ''",
      rotationStart: "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), '='), ';')) else (fn:current-date())",
      rotationEnd: "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), 'end='), ';')) else ((xs:string(fn:current-date()) ! concat(substring(string(), 0, 5) ! number() + 20, substring(string(), 5))))",
      rating: "*[name()='media:rating']/text()",
      cast: '',
      genres: "string-join(*[name()='media:category']/text(), ', ')",
      cuePoints: "if (exists(xumo:cuePoints)) then *[name()='xumo:cuePoints']/text() else ''",
      seriesMainThumbnail: "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
      seriesAltThumbnail: "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
      seriesBackgroundThumbnail: "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
      movieMainThumbnail: "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
      movieAltThumbnail: "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
      movieBackgroundThumbnail: "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
      episodeMainThumbnail: "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
      episodeAltThumbnail: "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
    };

    it('MAP_URL: Should map urls for reelz mrss', async () => {
      const request = {
        type: IngestVodState.MAP_URL,
        url: REELZ_FEED,
        mapping: reelzMapping,
        isPrivate: true,
      };

      // @ts-ignore
      const response = await handler(request, undefined);

      expect(response.type).toEqual(IngestVodState.INGEST);
      expect(response.url).toEqual([REELZ_FEED]);
    });

    it('INGEST: Should ingest the reelz feed', async () => {
      const request = {
        type: IngestVodState.INGEST,
        url: REELZ_FEED,
        mapping: reelzMapping,
        provider: 'provider-id',
        packages: ['package-id'],
        isPrivate: false,
      };

      // @ts-ignore
      const response = await handler(request, undefined);

      expect(response.type).toEqual(IngestVodState.DONE);
      const ingestion = await ingestionRepository.findByExtId(REELZ_FEED);

      expect(ingestion).toBeDefined();
      expect(ingestion?.status).toEqual(MrssIngestionStatus.IN_PROGRESS);
      expect(ingestion?.saved?.length).toBeGreaterThan(0);
    });

    it('INGEST: Should re-ingest the reelz feed with some failure', async () => {
      const request = {
        type: IngestVodState.INGEST,
        url: REELZ_FEED,
        mapping: reelzMapping,
        provider: 'provider-id',
        packages: ['package-id'],
        isPrivate: false,
      };

      // @ts-ignore
      const response = await handler(request, undefined);

      expect(response.type).toEqual(IngestVodState.DONE);

      const ingestion = await ingestionRepository.findByExtId(REELZ_FEED);

      expect(ingestion).toBeDefined();
      expect(ingestion?.status).toEqual(MrssIngestionStatus.IN_PROGRESS);
      // Everything was saved by the previous ingestion, so it is reported as "already exists".
      expect(ingestion?.failures?.length).toBeGreaterThan(0);
    });

    it('FAILURE: Should mark the reelz ingestion as failed', async () => {
      // @ts-ignore
      const response = await handler({
        type: IngestVodState.FAILURE,
        url: REELZ_FEED,
        mapping: reelzMapping,
        isPrivate: false,
        error: 'error text',
      }, undefined);

      expect(response.type).toEqual(IngestVodState.DONE);
      const ingestion = await ingestionRepository.findByExtId(REELZ_FEED);

      expect(ingestion).toBeDefined();
      expect(ingestion?.status).toEqual(MrssIngestionStatus.FAILED);
      expect(ingestion?.failures?.length).toBeGreaterThan(0);
    });

    it('Entities should have been created', async () => {
      // The reelz feed only carries series + episodes (every item has xumo:episodic), no movies.
      const series = await seriesRepository.findAll();
      const episodes = await episodeRepository.findAll();

      expect(series.series.length).toBeGreaterThan(0);
      expect(episodes.episodes.length).toBeGreaterThan(0);

      // Check that vod assets have provider and packages set by default
      const seriesWithProvider = series.series
        .filter((seriesItem) => seriesItem.provider !== undefined);
      const seriesWithPackages = series.series
        .filter((seriesItem) => seriesItem.packages?.length);

      expect(seriesWithProvider.length).toBeGreaterThan(0);
      expect(seriesWithPackages.length).toBeGreaterThan(0);
    });
  });
});
