import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

import DynamoDBTableUtils from '../../../../../utils/database-table-utils';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../../utils/in-memory-relation-repositories';
import { MovieRating, Rating } from '../../../../asset/shared/Rating';
import Category from '../../../../category/shared/Category';
import CategoryMap from '../../../../category/shared/CategoryMap';
import CategoryRepository from '../../../../category/shared/CategoryRepository';
import Genre from '../../../../genre/shared/Genre';
import Location from '../../../../location/shared/Location';
import Package from '../../../../package/shared/Package';
import Platform from '../../../../platform/shared/Platform';
import Provider from '../../../../provider/shared/Provider';
import { LocationType } from '../../../../shared/dto/LocationDto';
import { PackageType, RevenueModel } from '../../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../../shared/dto/ProviderDto';
import GenreMap from '../../../../genre/shared/GenreMap';
import GenreRepository from '../../../../genre/shared/GenreRepository';
import LocationFactory from '../../../../location/shared/LocationFactory';
import LocationRepository from '../../../../location/shared/LocationRepository';
import PackageFactory from '../../../../package/shared/PackageFactory';
import PackageRepository from '../../../../package/shared/PackageRepository';
import PlatformMap from '../../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../../platform/shared/PlatformRepository';
import ProviderMap from '../../../../provider/shared/ProviderMap';
import ProviderRepository from '../../../../provider/shared/ProviderRepository';
import { StreamFormat, StreamType } from '../../../../shared/dto/StreamDto';
import StorageAdaptor from '../../../../shared/StorageAdaptor';
import { ILogTracker } from '../../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../../shared/tracker/LogTrackAdaptor';
import Stream from '../../../../stream/shared/Stream';
import SeriesFactory from '../../../series/shared/SeriesFactory';
import SeriesRepository from '../../../series/shared/SeriesRepository';
import StreamFactory from '../../../../stream/shared/StreamFactory';
import Episode from '../../shared/Episode';
import StreamRepository from '../../../../stream/shared/StreamRepository';
import EpisodeFactory from '../../shared/EpisodeFactory';
import EpisodeRepository from '../../shared/EpisodeRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeleteEpisodeDomain from '../DeleteEpisodeDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-DeleteEpisodeAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}
const logTracker = new MockLogTracker();

const EPISODE_ID = 'my-episode-id';
const SERIES_ID = 'my-series-id';

const uid = new UIDGenerator();

const uidEpisode = {
  generate: () => EPISODE_ID,
};

const uidSeries = {
  generate: () => SERIES_ID,
};

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

const distributorRepository = new InMemoryDistributorRepository();
const brandRepository = new InMemoryBrandRepository();

const streamFactory = new StreamFactory(uid);
const streamRepository = new StreamRepository(
  ddbClient,
  TEST_TABLE_NAME,
  streamFactory,
);

const episodeFactory = new EpisodeFactory(
  uidEpisode,
  streamRepository,
  'default/nothumbnail/thumbnail.png',
);

const episodeRepository = new EpisodeRepository(ddbClient, TEST_TABLE_NAME, episodeFactory);

const seriesFactory = new SeriesFactory(
  uidSeries,
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

const s3Client = new S3Client({});
const s3Mock = mockClient(s3Client);
const fileStore = new StorageAdaptor(s3Client, 'test', uid);

const domain = new DeleteEpisodeDomain(episodeRepository, seriesRepository, fileStore, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
  s3Mock.onAnyCommand().resolves({});
});

afterAll(() => {
  jest.useRealTimers();
});

const handlerPayloadMock = {
  ...eventMock,
  pathParameters: {
    id: EPISODE_ID,
  },
};

const CASES = [{
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: EPISODE_ID } },
  expected: {
    body: '',
    statusCode: 204,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: 'random' } },
  expected: {
    body: '{"error":"Episode Not Found"}',
    statusCode: 404,
  },
},
{
  mockEvent: { ...handlerPayloadMock, pathParameters: undefined },
  expected: {
    body: '',
    statusCode: 500,
  },
}];

describe('Delete Episode ApiGatewayAdaptor', () => {
  let stream: Stream;
  let episode: Episode;

  const episodeDto = {
    extId: 'episode-extId',
    description: 'Test episode',
    name: 'Reelz_SD',
    rating: Rating.TV_14,
    season: '1',
    number: 1,
    duration: '00:59:00',
    contentData: 'data',
    originalAirDate: '2023-11-10T17:10:000Z',
    availableDate: '2022-11-10T17:10:000Z',
    expirationDate: '2023-11-10T17:10:000Z',
    slug: 'reelz-sd',
    thumbnail: 'episodes/myepisodeid/thumbnail.png',
    alternateThumbnail: 'episodes/myepisodeid/alternate-thumbnail.png',
    streams: [],
  };

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    const genre = Genre.create({
      extId: 'genre-extId',
      name: 'Reelz_SD',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'genre-id');
    const platform = Platform.create({
      extId: 'platform-extid',
      name: 'platform-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'platform-id');
    const category = Category.create({
      extId: 'category-extid',
      name: 'category-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'category-id');
    const packageItem = Package.create({
      extId: 'package-extid',
      name: 'package-name',
      thumbnail: 'packages/id/thumbnail.png',
      default: false,
      description: 'This is a package',
      price: '6.99',
      type: PackageType.INTERNAL,
      revenueModel: RevenueModel.PAID,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'package-id');
    const location = Location.create({
      extId: 'location-extid',
      slug: 'location-extid',
      name: 'location-name',
      type: LocationType.PACKAGE,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'location-id');
    const provider = Provider.create({
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
    }, 'provider-id');

    stream = Stream.create({
      extId: 'provider-extId',
      name: 'Provider Reelz_SD',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      daiParams: true,
      weight: 1,
      data: 'my-stream-data',
      enabled: true,
    }, 'stream-id');

    await streamRepository.save(stream);

    const streamProps = {
      name: 'my-new-episode-stream',
      extId: 'new-episode-stream',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: 'data',
      daiParams: true,
      weight: 1,
    };

    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await locationRepository.save(location);
    await providerRepository.save(provider);

    episode = await episodeFactory.toDomain({
      ...episodeDto,
      description: 'Value Episodes',
      rating: Rating.TV_14,
      season: '1',
      number: 1,
      duration: '00:59:00',
      contentData: 'data',
      originalAirDate: '2023-11-10T17:10:000Z',
      availableDate: 'avail-date',
      expirationDate: 'expire-date',
      streams: [stream.id, streamProps],
      seriesId: SERIES_ID,
    });

    await episodeRepository.save(episode);
    const series = await seriesFactory.toDomain({
      thumbnail: 'episodes/episodeid/thumbnail.png',
      alternateThumbnail: 'episodes/episodeid/alternate-thumbnail.png',
      backgroundThumbnail: 'episodes/episodeid/background-thumbnail.png',
      name: 'Value Seriess #1',
      extId: 'value:1',
      slug: 'value:1',
      description: 'Value Seriess',
      vastId: 'vastid',
      rating: MovieRating.PG,
      availableDate: 'avail-date',
      expirationDate: 'expire-date',
      cast: 'cast',
      provider: provider.id,
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      brands: ['118', '131'],
    });
    await seriesRepository.save(series);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      const response = await apiGatewayAdaptor.handler(mockEvent);
      expect(response).toStrictEqual(expected);
    });
  });

  describe('Check that deletion is done correctly', () => {
    it('should have no more relations', async () => {
      expect(await episodeRepository.hasRelationships(episode)).toBeFalsy();
    });

    it('should get series without the deleted episode', async () => {
      const series = await seriesRepository.findOne(SERIES_ID);

      expect(series).toBeDefined();
      expect(series?.episodes?.length).toEqual(0);
    });

    it('should have no more items and relations in DB', async () => {
      const { Items } = await episodeRepository.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${EpisodeRepository.ROOT_ENTITY}#${EPISODE_ID}`,
        },
      });

      expect(Items?.length).toEqual(0);
    });
  });
});
