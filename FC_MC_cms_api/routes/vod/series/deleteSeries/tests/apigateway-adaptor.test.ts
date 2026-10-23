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
import GenreMap from '../../../../genre/shared/GenreMap';
import GenreRepository from '../../../../genre/shared/GenreRepository';
import Location from '../../../../location/shared/Location';
import LocationFactory from '../../../../location/shared/LocationFactory';
import LocationRepository from '../../../../location/shared/LocationRepository';
import Package from '../../../../package/shared/Package';
import PackageFactory from '../../../../package/shared/PackageFactory';
import PackageRepository from '../../../../package/shared/PackageRepository';
import Platform from '../../../../platform/shared/Platform';
import PlatformMap from '../../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../../platform/shared/PlatformRepository';
import Provider from '../../../../provider/shared/Provider';
import ProviderMap from '../../../../provider/shared/ProviderMap';
import ProviderRepository from '../../../../provider/shared/ProviderRepository';
import { LocationType } from '../../../../shared/dto/LocationDto';
import {
  RevenueModel, PackageType,
} from '../../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../../shared/dto/ProviderDto';
import { StreamFormat, StreamType } from '../../../../shared/dto/StreamDto';
import { IPublisher } from '../../../../shared/interfaces/IPublisher';
import { PublisherEvent } from '../../../../shared/PublisherAdaptor';
import StorageAdaptor from '../../../../shared/StorageAdaptor';
import { ILogTracker } from '../../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../../shared/tracker/LogTrackAdaptor';
import StreamFactory from '../../../../stream/shared/StreamFactory';
import StreamRepository from '../../../../stream/shared/StreamRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import Episode from '../../../episode/shared/Episode';
import EpisodeFactory from '../../../episode/shared/EpisodeFactory';
import EpisodeRepository from '../../../episode/shared/EpisodeRepository';
import Series from '../../shared/Series';
import SeriesFactory from '../../shared/SeriesFactory';
import SeriesRepository from '../../shared/SeriesRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeleteSeriesDomain from '../DeleteSeriesDomain';

const TEST_TABLE_NAME = 'test-DeleteSeriesAdaptor';

class MockPublisher implements IPublisher<PublisherEvent> {
  publish(_event: PublisherEvent): Promise<boolean> {
    return Promise.resolve(true);
  }
}

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}
const logTracker = new MockLogTracker();

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const SERIES_ID = 'my-series-id';

const uid = new UIDGenerator();

const uidSeries = {
  generate: () => SERIES_ID,
};

const uidCategory = {
  generate: () => 'category-id',
};

const uidGenre = {
  generate: () => 'genre-id',
};

const providerMap = new ProviderMap(uid);
const providerRepository = new ProviderRepository(ddbClient, TEST_TABLE_NAME, providerMap);

const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TEST_TABLE_NAME, platformMap);

const categoryMap = new CategoryMap(uidCategory);
const categoryRepository = new CategoryRepository(ddbClient, TEST_TABLE_NAME, categoryMap);

const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);

const genreMap = new GenreMap(uidGenre);
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
const episodeRepository = new EpisodeRepository(
  ddbClient,
  TEST_TABLE_NAME,
  episodeFactory,
);

const distributorRepository = new InMemoryDistributorRepository();

const brandRepository = new InMemoryBrandRepository();

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

const seriesRepository = new SeriesRepository(ddbClient, TEST_TABLE_NAME, seriesFactory);

const s3Client = new S3Client({});
const s3Mock = mockClient(s3Client);
const fileStore = new StorageAdaptor(s3Client, 'test', uid);

const domain = new DeleteSeriesDomain(seriesRepository, fileStore, new MockPublisher(), logTracker);
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
    id: SERIES_ID,
  },
};

const CASES = [{
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: SERIES_ID } },
  expected: {
    body: '{"error":"Cannot delete a Series with dependencies"}',
    statusCode: 422,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: SERIES_ID } },
  expected: {
    body: '',
    statusCode: 204,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: 'random' } },
  expected: {
    body: '{"error":"Series Not Found"}',
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

describe('Delete Series ApiGatewayAdaptor', () => {
  let genre: Genre;
  let platform: Platform;
  let category: Category;
  let packageItem: Package;
  let location: Location;
  let provider: Provider;
  let series: Series;
  let episode: Episode;

  const seriesDto = {
    extId: 'series-extId',
    description: 'Test series',
    name: 'Reelz_SD',
    rating: MovieRating.PG,
    availableDate: '2022-11-10T17:10:000Z',
    expirationDate: '2023-11-10T17:10:000Z',
    slug: 'reelz-sd',
    vastId: 'vastId',
    thumbnail: 'series/myseriesid/thumbnail.png',
    alternateThumbnail: 'series/myseriesid/alternate-thumbnail.png',
    backgroundThumbnail: 'series/myseriesid/background-thumbnail.png',
    provider: '',
    packages: [],
    categories: [],
    brands: [],
    platforms: [],
  };

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');

    genre = Genre.create({
      extId: 'genre-extId',
      name: 'Reelz_SD',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'genre-id');
    platform = Platform.create({
      extId: 'platform-extid',
      name: 'platform-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'platform-id');
    category = Category.create({
      extId: 'category-extid',
      name: 'category-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'category-id');
    packageItem = Package.create({
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
    location = Location.create({
      extId: 'location-extid',
      slug: 'location-extid',
      name: 'location-name',
      type: LocationType.PACKAGE,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'location-id');
    provider = Provider.create({
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

    await providerRepository.save(provider);
    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await genreRepository.save(genre);
    await locationRepository.save(location);

    const existingDistributorIds = ['13', '28', '36'];
    const existingBrandIds = ['118', '131', '237'];

    series = await seriesFactory.toDomain({
      ...seriesDto,
      description: 'Value Series',
      vastId: 'vastid',
      rating: MovieRating.NC_17,
      availableDate: 'avail-date',
      expirationDate: 'expire-date',
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    });

    await seriesRepository.save(series);

    episode = await episodeFactory.toDomain({
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
      streams: [{
        name: 'my-new-episode-stream',
        extId: 'new-episode-stream',
        type: StreamType.STREAM,
        format: StreamFormat.HLS,
        data: 'data',
        daiParams: true,
        weight: 1,
      }],
      seriesId: SERIES_ID,
    });

    await episodeRepository.save(episode);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      const response = await apiGatewayAdaptor.handler(mockEvent);
      expect(response).toStrictEqual(expected);
      if (response.statusCode === 422) {
        await episodeRepository.remove(episode);
      }
    });
  });

  describe('Check that deletion is done correctly', () => {
    it('should have no more relations', async () => {
      expect(await seriesRepository.hasRelationships(series)).toBeFalsy();
    });

    it('should not be able to get series', async () => {
      const seriesItem = await seriesRepository.findOne(SERIES_ID);

      expect(seriesItem).toBeUndefined();
    });

    it('should have no more items and relations in DB', async () => {
      const { Items } = await seriesRepository.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${SeriesFactory.ROOT_ENTITY}#${SERIES_ID}`,
        },
      });

      expect(Items?.length).toEqual(0);
    });
  });
});
