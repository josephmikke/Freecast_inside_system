import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Response } from 'cross-fetch';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import DynamoDBTableUtils from '../../../../../utils/database-table-utils';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../../utils/in-memory-relation-repositories';
import ProviderRepository from '../../../../provider/shared/ProviderRepository';
import PlatformMap from '../../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../../platform/shared/PlatformRepository';
import CategoryMap from '../../../../category/shared/CategoryMap';
import CategoryRepository from '../../../../category/shared/CategoryRepository';
import PackageFactory from '../../../../package/shared/PackageFactory';
import PackageRepository from '../../../../package/shared/PackageRepository';
import GenreMap from '../../../../genre/shared/GenreMap';
import GenreRepository from '../../../../genre/shared/GenreRepository';
import LocationFactory from '../../../../location/shared/LocationFactory';
import LocationRepository from '../../../../location/shared/LocationRepository';
import ProviderMap from '../../../../provider/shared/ProviderMap';
import StreamFactory from '../../../../stream/shared/StreamFactory';
import StreamRepository from '../../../../stream/shared/StreamRepository';
import EpisodeFactory from '../../../episode/shared/EpisodeFactory';
import EpisodeRepository from '../../../episode/shared/EpisodeRepository';
import HttpClientAdaptor from '../../../../epg/shared/HttpClientAdaptor';
import { IHttpClient } from '../../../../epg/shared/IHttpClient';
import SeriesFactory from '../../../series/shared/SeriesFactory';
import { MRSSError } from '../MRSSError';
import MRSSParser from '../MRSSParser';
import MrssPathAdaptor from '../MrssPathAdaptor';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import MovieFactory from '../../../movie/shared/MovieFactory';

const TEST_TABLE_NAME = 'test-mrssParser';

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
const providerRepository = new ProviderRepository(ddbClient, TEST_TABLE_NAME, providerMap);

const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TEST_TABLE_NAME, platformMap);

const categoryMap = new CategoryMap(uid);
const categoryRepository = new CategoryRepository(ddbClient, TEST_TABLE_NAME, categoryMap);

const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);

const genreMap = new GenreMap(uid);
const genreRepository = new GenreRepository(ddbClient, TEST_TABLE_NAME, genreMap);

const locationFactory = new LocationFactory(uid, packageRepository);
const locationRepository = new LocationRepository(ddbClient, TEST_TABLE_NAME, locationFactory);

const streamFactory = new StreamFactory(uid);
const streamRepository = new StreamRepository(
  ddbClient,
  TEST_TABLE_NAME,
  streamFactory,
);

const episodeFactory = new EpisodeFactory(uid, streamRepository, 'default/nothumbnail/thumbnail.png');
const episodeRepository = new EpisodeRepository(ddbClient, TEST_TABLE_NAME, episodeFactory);

const REELZ_FEED = 'https://d2d6fj119jntet.cloudfront.net/Jest/Reelz_MRSS_Freecast_339-344.xml';
const REELZ_FEED_FIXTURE = readFileSync(path.join(__dirname, 'assets/reelz-mrss-339-344.xml'), 'utf8');
const MISSING_FEED = 'https://d2d6fj119jntet.cloudfront.net/Jest/doesnt-exist';
// 1x1 transparent PNG
const THUMBNAIL_FIXTURE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

/**
 * Serves the Reelz feed, a missing feed and the feed's thumbnails from local fixtures. The live
 * CloudFront/S3 requests hung up or timed out, failing the suite at random. Response comes from
 * cross-fetch, not the jest global one. Any other URL goes to the real client.
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
    if (url === MISSING_FEED) {
      return new Response('', { status: 403, statusText: 'Forbidden' });
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

describe('MRSS Parser', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe('fetch', () => {
    it('should fetch MRSS feed', async () => {
      // Arrange
      const mrssPath = new MrssPathAdaptor();
      const mrssParser = new MRSSParser(httpClient, mrssPath);

      // Act
      const result = await mrssParser.fetch('https://d2d6fj119jntet.cloudfront.net/Jest/Reelz_MRSS_Freecast_339-344.xml');

      // Assert
      expect(result).not.toBeNull();
      expect(result).not.toBeUndefined();
    });

    it('should throw an UnableToFetchMrss exception', async () => {
      // Arrange
      const mrssPath = new MrssPathAdaptor();
      const mrssParser = new MRSSParser(httpClient, mrssPath);

      // Act & Assert
      await expect(async () => mrssParser.fetch('https://d2d6fj119jntet.cloudfront.net/Jest/doesnt-exist'))
        .rejects.toThrow(MRSSError.UnableToFetchMrss);
    });
  });

  describe('parse', () => {
    it('should throw error for bestever', async () => {
      // Arrange
      const mrssPath = new MrssPathAdaptor();
      const mrssParser = new MRSSParser(httpClient, mrssPath);
      const mrss = await mrssParser.fetch('https://d2d6fj119jntet.cloudfront.net/Jest/Reelz_MRSS_Freecast_339-344.xml');

      // Act
      await expect(async () => mrssParser.parse(mrss, {
        root: '//channel/item',
        nextPage: '',
        guid: 'guid',
        extId: 'guid',
        title: 'title',
        asset: "*[name()='media:content'] ! map:merge((@height|@width|@duration|@type|@url) ! map{local-name(): string()})",
        thumbnails: "array { *[name()='media:group']/*[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
        subtitle: "array { *[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
        pubDate: 'pubDate',
        seasonNum: ".//*[name()='xumo:seasonNum']/text()",
        episodeNum: ".//*[name()='xumo:episodeNum']/text()",
        type: "*[name()='xumo:episodic']/@type",
        seriesId: ".//*[name()='xumo:seriesId']/text()",
        description: 'description',
        rotationEnd: "substring-after(*[name()='dcterms:valid']/text(), 'end=')",
        rotationStart: "substring-before(substring-after(*[name()='dcterms:valid']/text(), '='), ';')",
        rating: "*[name()='media:rating']/text()",
        cast: '',
        genres: '',
        cuePoints: "*[name()='xumo:cuePoints']/text()",
        seriesMainThumbnail: '',
        seriesAltThumbnail: '',
        seriesBackgroundThumbnail: '',
        movieMainThumbnail: '',
        movieAltThumbnail: '',
        movieBackgroundThumbnail: '',
        episodeMainThumbnail: '',
        episodeAltThumbnail: '',
      }))
        .rejects.toThrow(MRSSError.UnableToParse);
    });

    it('should return an array of MRSSItem for xumo reelz', async () => {
      // Arrange
      const mrssPath = new MrssPathAdaptor();
      const mrssParser = new MRSSParser(httpClient, mrssPath);
      const mrss = await mrssParser.fetch('https://d2d6fj119jntet.cloudfront.net/Jest/Reelz_MRSS_Freecast_339-344.xml');

      // Act
      const results = await mrssParser.parse(mrss, {
        "root": "//channel/item",
        "nextPage": "",
        "guid": "*[name()='guid']/text()",
        "extId": "*[name()='guid']/text()",
        "title": "title | *[name()='media:title']/text()",
        "description": "description | *[name()='media:description']/text()",
        "asset": "*[name()='media:content'] ! map:merge(((@height|@width|@duration|@url) ! map{local-name(): string()}, @medium ! map{'type': string()}))",
        "subtitle": "array { *[name()='media:group']/*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
        "thumbnails": "array { *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
        "pubDate": "pubDate",
        "seasonNum": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text() else ''",
        "episodeNum": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text() else ''",
        "type": "*[name()='xumo:episodic']/@type",
        "seriesId": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seriesId']/text() else ''",
        "rotationStart": "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), '='), ';')) else (fn:current-date())",
        "rotationEnd": "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), 'end='), ';')) else ((xs:string(fn:current-date()) ! concat(substring(string(), 0, 5) ! number() + 20, substring(string(), 5))))",
        "rating": "*[name()='media:rating']/text()",
        "cast": "",
        "genres": "string-join(*[name()='media:category']/text(), ', ')",
        "cuePoints": "if (exists(xumo:cuePoints)) then *[name()='xumo:cuePoints']/text() else ''",
        "seriesMainThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "seriesAltThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "seriesBackgroundThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "movieMainThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "movieAltThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "movieBackgroundThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "episodeMainThumbnail": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "episodeAltThumbnail": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())"
      });

      expect(results.length).toEqual(12);

      expect((await mrssParser.parsedItemsToAssets(
        episodeFactory,
        movieFactory,
        seriesFactory,
        httpClient,
        results,
        '',
      )).length).toEqual(results.length);
    });

    it('should return an array of MRSSItem for crackle', async () => {
      // Arrange
      const mrssPath = new MrssPathAdaptor();
      const mrssParser = new MRSSParser(httpClient, mrssPath);
      const mrss = await mrssParser.fetch('https://d2d6fj119jntet.cloudfront.net/Jest/Reelz_MRSS_Freecast_339-344.xml');

      // Act
      const result = await mrssParser.parse(mrss, {
        "root": "//channel/item",
        "nextPage": "",
        "guid": "*[name()='guid']/text()",
        "extId": "*[name()='guid']/text()",
        "title": "title | *[name()='media:title']/text()",
        "description": "description | *[name()='media:description']/text()",
        "asset": "*[name()='media:content'] ! map:merge(((@height|@width|@duration|@url) ! map{local-name(): string()}, @medium ! map{'type': string()}))",
        "subtitle": "array { *[name()='media:group']/*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
        "thumbnails": "array { *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
        "pubDate": "pubDate",
        "seasonNum": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text() else ''",
        "episodeNum": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text() else ''",
        "type": "*[name()='xumo:episodic']/@type",
        "seriesId": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seriesId']/text() else ''",
        "rotationStart": "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), '='), ';')) else (fn:current-date())",
        "rotationEnd": "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), 'end='), ';')) else ((xs:string(fn:current-date()) ! concat(substring(string(), 0, 5) ! number() + 20, substring(string(), 5))))",
        "rating": "*[name()='media:rating']/text()",
        "cast": "",
        "genres": "string-join(*[name()='media:category']/text(), ', ')",
        "cuePoints": "if (exists(xumo:cuePoints)) then *[name()='xumo:cuePoints']/text() else ''",
        "seriesMainThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "seriesAltThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "seriesBackgroundThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "movieMainThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "movieAltThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "movieBackgroundThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "episodeMainThumbnail": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "episodeAltThumbnail": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())"
      });

      // Assert
      expect(result.length).toEqual(12);
    });

    it('should get all crackle pages', async () => {
      const mrssPath = new MrssPathAdaptor();
      const mrssParser = new MRSSParser(httpClient, mrssPath);

      expect((await mrssParser.mapUrl('https://d2d6fj119jntet.cloudfront.net/Jest/Reelz_MRSS_Freecast_339-344.xml', {
        "root": "//channel/item",
        "nextPage": "",
        "guid": "*[name()='guid']/text()",
        "extId": "*[name()='guid']/text()",
        "title": "title | *[name()='media:title']/text()",
        "description": "description | *[name()='media:description']/text()",
        "asset": "*[name()='media:content'] ! map:merge(((@height|@width|@duration|@url) ! map{local-name(): string()}, @medium ! map{'type': string()}))",
        "subtitle": "array { *[name()='media:group']/*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
        "thumbnails": "array { *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
        "pubDate": "pubDate",
        "seasonNum": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text() else ''",
        "episodeNum": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text() else ''",
        "type": "*[name()='xumo:episodic']/@type",
        "seriesId": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seriesId']/text() else ''",
        "rotationStart": "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), '='), ';')) else (fn:current-date())",
        "rotationEnd": "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), 'end='), ';')) else ((xs:string(fn:current-date()) ! concat(substring(string(), 0, 5) ! number() + 20, substring(string(), 5))))",
        "rating": "*[name()='media:rating']/text()",
        "cast": "",
        "genres": "string-join(*[name()='media:category']/text(), ', ')",
        "cuePoints": "if (exists(xumo:cuePoints)) then *[name()='xumo:cuePoints']/text() else ''",
        "seriesMainThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "seriesAltThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "seriesBackgroundThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "movieMainThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "movieAltThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "movieBackgroundThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "episodeMainThumbnail": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "episodeAltThumbnail": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())"
      })).length).toEqual(1);
    });

    it('should only get the first url if nextPage is an empty string', async () => {
      const mrssPath = new MrssPathAdaptor();
      const mrssParser = new MRSSParser(httpClient, mrssPath);
      const mapping = {
        "root": "//channel/item",
        "nextPage": "",
        "guid": "*[name()='guid']/text()",
        "extId": "*[name()='guid']/text()",
        "title": "title | *[name()='media:title']/text()",
        "description": "description | *[name()='media:description']/text()",
        "asset": "*[name()='media:content'] ! map:merge(((@height|@width|@duration|@url) ! map{local-name(): string()}, @medium ! map{'type': string()}))",
        "subtitle": "array { *[name()='media:group']/*[name()='media:subTitle'] ! map:merge((@type|@lang|@href) ! map{local-name(): string()})}",
        "thumbnails": "array { *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()})}",
        "pubDate": "pubDate",
        "seasonNum": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seasonNum']/text() else ''",
        "episodeNum": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:episodeNum']/text() else ''",
        "type": "*[name()='xumo:episodic']/@type",
        "seriesId": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='xumo:episodic']/*[name()='xumo:seriesId']/text() else ''",
        "rotationStart": "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), '='), ';')) else (fn:current-date())",
        "rotationEnd": "if (exists(dcterms:valid)) then (substring-before(substring-after(*[name()='dcterms:valid']/text(), 'end='), ';')) else ((xs:string(fn:current-date()) ! concat(substring(string(), 0, 5) ! number() + 20, substring(string(), 5))))",
        "rating": "*[name()='media:rating']/text()",
        "cast": "",
        "genres": "string-join(*[name()='media:category']/text(), ', ')",
        "cuePoints": "if (exists(xumo:cuePoints)) then *[name()='xumo:cuePoints']/text() else ''",
        "seriesMainThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "seriesAltThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "seriesBackgroundThumbnail": "if (*[name()='xumo:episodic'][@type='series']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "movieMainThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "movieAltThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "movieBackgroundThumbnail": "if (exists(xumo:episodic)) then '' else *[name()='media:thumbnail'][1] ! map:merge((@width|@height|@url) ! map{local-name(): string()})",
        "episodeMainThumbnail": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())",
        "episodeAltThumbnail": "if (*[name()='xumo:episodic'][@type='episode']) then *[name()='media:thumbnail'] ! map:merge((@height|@width|@url) ! map{local-name(): string()}) else map:merge(())"
      };

      const result = await mrssParser.mapUrl('https://d2d6fj119jntet.cloudfront.net/Jest/Reelz_MRSS_Freecast_339-344.xml', mapping);
      expect(result.length).toEqual(1);
    });
  });
});
