import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { EventBridgeEvent, Context } from 'aws-lambda';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../utils/in-memory-relation-repositories';
import { MovieRating } from '../../../asset/shared/Rating';
import CategoryMap from '../../../category/shared/CategoryMap';
import CategoryRepository from '../../../category/shared/CategoryRepository';
import GenreMap from '../../../genre/shared/GenreMap';
import GenreRepository from '../../../genre/shared/GenreRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import LocationFactory from '../../../location/shared/LocationFactory';
import LocationRepository from '../../../location/shared/LocationRepository';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import ProviderMap from '../../../provider/shared/ProviderMap';
import ProviderRepository from '../../../provider/shared/ProviderRepository';
import { StreamFormat } from '../../../shared/dto/StreamDto';
import {
  AssetCreationVodEvent, IngestionRequestDto, MediaJobStatus, MrssIngestionStatus,
} from '../../../shared/dto/vod/IngestDto';
import { MovieDto } from '../../../shared/dto/vod/MovieDto';
import StreamFactory from '../../../stream/shared/StreamFactory';
import StreamRepository from '../../../stream/shared/StreamRepository';
import EpisodeFactory from '../../episode/shared/EpisodeFactory';
import EpisodeRepository from '../../episode/shared/EpisodeRepository';
import Ingestion from '../../ingestion/shared/Ingestion';
import IngestionFactory from '../../ingestion/shared/IngestionFactory';
import IngestionRepository from '../../ingestion/shared/IngestionRepository';
import Movie from '../../movie/shared/Movie';
import MovieFactory from '../../movie/shared/MovieFactory';
import MovieRepository from '../../movie/shared/MovieRepository';
import AssetCrationVodAdaptor from '../HandleAssetCreationVodAdaptor';
import AssetCrationVodDomain from '../HandleAssetCreationVodDomain';
import SeriesFactory from '../../series/shared/SeriesFactory';
import SeriesRepository from '../../series/shared/SeriesRepository';

process.env.MEDIATAILOR_HLS_PREFIX_URL = 'test.com';
// Packaging configuration → stream format mapping, as set for the `test` stage in environment.yml
process.env.ENV = 'test';
process.env.HLS_PACKAGE_NAME_TEST = 'HLS_test';
process.env.HLS_DRM_PACKAGE_NAME_TEST = 'HLS_DRM_test';
process.env.DASH_PACKAGE_NAME_TEST = 'DASH_test';
process.env.DASH_DRM_PACKAGE_NAME_TEST = 'DASH_DRM_test';

const uid = new UIDGenerator();
const TEST_TABLE_NAME = 'test-handleAssetCreationVodAdaptor';
const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

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

const ingestionFactory = new IngestionFactory(uid);
const ingestionRepository = new IngestionRepository(
  ddbClient,
  TEST_TABLE_NAME,
  ingestionFactory,
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
  process.env.NO_THUMBNAIL_URL!,
);
const seriesRepository = new SeriesRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  seriesFactory,
);

const domain = new AssetCrationVodDomain(
  episodeRepository,
  movieRepository,
  'test',
  ingestionRepository,
  seriesRepository
);

const adaptor = new AssetCrationVodAdaptor(domain);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const context: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: '',
  functionVersion: '',
  invokedFunctionArn: '',
  memoryLimitInMB: '',
  awsRequestId: '',
  logGroupName: '',
  logStreamName: '',
  getRemainingTimeInMillis: () => 0,
  done: () => {},
  fail: (_err: Error | string) => {},
  succeed: (_msg: any) => {},
};

const event: EventBridgeEvent<string, AssetCreationVodEvent> = {
  id: '',
  version: '',
  account: '',
  time: '',
  region: '',
  resources: [
    'arn:aws:mediapackage-vod:us-east-1:123456789123:assets/14f5ec2c23569e53_movies_bd3916aaedb3c772',
  ],
  source: '',
  'detail-type': 'MediaPackage Input Notification',
  detail: {
    event: 'IngestStart',
    message: '',
    manifest_urls: [
      'https://cc555f09bb9d1ae27eadda406c30971a.egress.mediapackage-vod.us-east-1.amazonaws.com/out/v1/4ab05e9e709941e3b5f29ffa18760875/203e2e2ddf3e423998741f0e20f65292/498d36cccecc4c4db90f568e096c3dd1/index.mpd',
    ],
    packaging_configuration_id: undefined,
  },
};

describe('HandleAssetCreationVodAdaptor', () => {
  let ingestion: Ingestion;
  let movie: Movie;
  let movie2: Movie;

  const ingestionDto: IngestionRequestDto = {
    extId: 'ingestion-extId',
    parentId: 'parent-id',
    status: MrssIngestionStatus.IN_PROGRESS,
  };
  const movieDto: MovieDto = {
    slug: 'movie-extId',
    description: 'Test movie',
    name: 'Reelz_SD',
    rating: MovieRating.NOT_RATED,
    availableDate: '2022-11-10T17:10:000Z',
    expirationDate: '2023-11-10T17:10:000Z',
    isIngest: true,
    extId: 'reelz-sd',
    vastId: 'vastId',
    imdbId: 'id',
    tmdbId: 'id',
    contentData: 'content',
    releaseYear: '2020',
    cast: 'cast',
    thumbnail: 'movies/mymovieid/thumbnail.png',
    alternateThumbnail: 'movies/mymovieid/alternate-thumbnail.png',
    backgroundThumbnail: 'movies/mymovieid/background-thumbnail.png',
    provider: '',
    packages: [],
    categories: [],
    brands: [],
    streams: [],
    platforms: [],
  };

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');

    ingestion = await ingestionFactory.toDomain(ingestionDto);
    movie = await movieFactory.toDomain(movieDto);
    movie2 = await movieFactory.toDomain({
      ...movieDto,
      slug: 'new-movie-slug',
    });

    await ingestionRepository.save(ingestion);
    await movieRepository.save(movie);
    await movieRepository.save(movie2);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('Ingestion Entity should not have jobs, failures and saved', () => {
    expect(ingestion).toBeDefined();
    expect(ingestion.jobs).toEqual({});
    expect(ingestion.status).toEqual(MrssIngestionStatus.IN_PROGRESS);
    expect(ingestion.failures).toBeUndefined();
    expect(ingestion.saved).toBeUndefined();
  });

  it('it should add 2 new jobs with PROGRESSING status', async () => {
    await adaptor.handler({
      ...event,
      resources: [
        `arn:aws:mediapackage-vod:us-east-1:123456789123:assets/${ingestion.id}_movies_${movie.id}`,
      ],
      detail: {
        event: 'IngestStart',
        message: '',
      },
    }, context);
    await adaptor.handler({
      ...event,
      resources: [
        `arn:aws:mediapackage-vod:us-east-1:123456789123:assets/${ingestion.id}_movies_${movie2.id}`,
      ],
      detail: {
        event: 'IngestStart',
        message: '',
      },
    }, context);

    // Get latest ingestion version
    ingestion = await ingestionRepository.findOne(ingestion.id ?? '') ?? ingestion;

    expect(ingestion.status).toEqual(MrssIngestionStatus.IN_PROGRESS);
    expect(Object.values(ingestion.jobs ?? []).length).toEqual(2);
    expect(ingestion.jobs[`movies/${movie.id}`]).toEqual(MediaJobStatus.MEDIAPACKAGE_PROGRESSING);
    expect(ingestion.jobs[`movies/${movie2.id}`]).toEqual(MediaJobStatus.MEDIAPACKAGE_PROGRESSING);
  });

  it('it should update a job with ERROR status', async () => {
    await adaptor.handler({
      ...event,
      resources: [
        `arn:aws:mediapackage-vod:us-east-1:123456789123:assets/${ingestion.id}_movies_${movie.id}`,
      ],
      detail: {
        event: 'IngestError',
        message: 'Error message',
      },
    }, context);

    // Get latest ingestion version
    ingestion = await ingestionRepository.findOne(ingestion.id ?? '') ?? ingestion;

    expect(ingestion.status).toEqual(MrssIngestionStatus.FAILED);
    expect(Object.values(ingestion.jobs ?? []).length).toEqual(2);
    expect(ingestion.jobs[`movies/${movie.id}`]).toEqual(MediaJobStatus.MEDIAPACKAGE_ERROR);
    expect(ingestion.failures?.length).toEqual(1);
    expect(ingestion.failures?.at(0)).toEqual(`2022-10-17T00:00:00.000Z: Transcoding Error: movies/${movie.id}: MediaPackage Asset Creation: Error message`);
  });

  it('it should update a job with COMPLETE', async () => {
    ingestion = await ingestionRepository.findOne(ingestion.id ?? '') ?? ingestion;
    if (ingestion) { await ingestionRepository.updateStatus(ingestion, 'status', MrssIngestionStatus.IN_PROGRESS); }
    await adaptor.handler({
      ...event,
      resources: [
        `arn:aws:mediapackage-vod:us-east-1:123456789123:assets/${ingestion.id}_movies_${movie.id}`,
      ],
      detail: {
        event: 'IngestComplete',
        message: 'Ingest Completed',
      },
    }, context);
    await adaptor.handler({
      ...event,
      resources: [
        `arn:aws:mediapackage-vod:us-east-1:123456789123:assets/${ingestion.id}_movies_${movie2.id}`,
      ],
      detail: {
        event: 'IngestComplete',
        message: 'Ingest Completed',
      },
    }, context);

    // Get latest ingestion version
    ingestion = await ingestionRepository.findOne(ingestion.id ?? '') ?? ingestion;

    expect(ingestion.status).toEqual(MrssIngestionStatus.IN_PROGRESS);
    expect(Object.values(ingestion.jobs ?? []).length).toEqual(2);
    expect(ingestion.jobs[`movies/${movie.id}`]).toEqual(MediaJobStatus.MEDIAPACKAGE_COMPLETE);
    expect(ingestion.jobs[`movies/${movie2.id}`]).toEqual(MediaJobStatus.MEDIAPACKAGE_COMPLETE);
    expect(ingestion.failures?.length).toEqual(1);
  });

  it('it should update an ingestion with COMPLETED', async () => {
    await adaptor.handler({
      ...event,
      resources: [
        `arn:aws:mediapackage-vod:us-east-1:123456789123:assets/${ingestion.id}_movies_${movie.id}`,
      ],
      detail: {
        event: 'VodAssetPlayable',
        message: 'Ingest Completed',
        manifest_urls: [
          'https://cc555f09bb9d1ae27eadda406c30971a.egress.mediapackage-vod.us-east-1.amazonaws.com/out/v1/p1/p2/p3/index.mpd',
        ],
        packaging_configuration_id: 'DASH_DRM_test',
      },
    }, context);
    await adaptor.handler({
      ...event,
      resources: [
        `arn:aws:mediapackage-vod:us-east-1:123456789123:assets/${ingestion.id}_movies_${movie2.id}`,
      ],
      detail: {
        event: 'VodAssetPlayable',
        message: 'Ingest Completed',
        manifest_urls: [
          'https://cc555f09bb9d1ae27eadda406c30971a.egress.mediapackage-vod.us-east-1.amazonaws.com/out/v1/p1/p2/p3/index.m3u8',
        ],
        packaging_configuration_id: 'HLS_test',
      },
    }, context);

    // Get latest ingestion version
    ingestion = await ingestionRepository.findOne(ingestion.id ?? '') ?? ingestion;

    expect(ingestion.status).toEqual(MrssIngestionStatus.COMPLETED);
    expect(Object.values(ingestion.jobs ?? []).length).toEqual(2);
    expect(ingestion.jobs[`movies/${movie.id}`]).toEqual(MediaJobStatus.MEDIAPACKAGE_PLAYABLE);
    expect(ingestion.jobs[`movies/${movie2.id}`]).toEqual(MediaJobStatus.MEDIAPACKAGE_PLAYABLE);
    expect(ingestion.failures?.length).toEqual(1);

    const movieDashDrm = await movieRepository.findOne(movie.id);
    const movieHls = await movieRepository.findOne(movie2.id);

    if (movieDashDrm) {
      expect(movieDashDrm).toBeDefined();
      if (movieDashDrm.streams) {
        expect(movieDashDrm.streams.length).toEqual(2);
        expect(movieDashDrm.streams[0].format).toEqual(StreamFormat.DASH_DRM);
        expect(movieDashDrm.streams[0].data).toEqual('test/out/v1/p1/p2/p3/index.mpd');
      }
    }
    if (movieHls) {
      expect(movieHls).toBeDefined();
      if (movieHls.streams) {
        expect(movieHls.streams.length).toEqual(2);
        expect(movieHls.streams[0].format).toEqual(StreamFormat.HLS);
        expect(movieHls.streams[0].data).toEqual('test/out/v1/p1/p2/p3/index.m3u8');
      }
    }
  });
});
