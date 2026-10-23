import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

import DynamoDBTableUtils from '../../../../../utils/database-table-utils';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../../utils/in-memory-relation-repositories';
import { MovieRating } from '../../../../asset/shared/Rating';
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
import { PackageType, RevenueModel } from '../../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../../shared/dto/ProviderDto';
import { StreamFormat, StreamType } from '../../../../shared/dto/StreamDto';
import StorageAdaptor from '../../../../shared/StorageAdaptor';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';
import {ILogTracker} from "../../../../shared/tracker/ILogTracker";
import {TrackDto} from "../../../../shared/tracker/LogTrackAdaptor";
import Stream from '../../../../stream/shared/Stream';
import StreamFactory from '../../../../stream/shared/StreamFactory';
import StreamRepository from '../../../../stream/shared/StreamRepository';
import SeriesFactory from '../../../series/shared/SeriesFactory';
import SeriesRepository from '../../../series/shared/SeriesRepository';
import EpisodeFactory from '../../shared/EpisodeFactory';
import EpisodeRepository from '../../shared/EpisodeRepository';
import eventMock from '../../shared/tests/event-mock';
import AddEpisodeDomain from '../AddEpisodeDomain';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';

const TEST_TABLE_NAME = 'test-addEpisodeAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});
const s3Client = new S3Client({});
const s3Mock = mockClient(s3Client);
class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}
const logTracker = new MockLogTracker();

const THUMBNAIL_ID = new UIDGenerator().generate(8);
const EPISODE_ID = 'myepisodeid';
const SERIES_ID = 'myseriesid';
const thumbnailUid = {
  generate: () => THUMBNAIL_ID,
};

const uid = new UIDGenerator();

const uidEpisode = {
  generate: () => EPISODE_ID,
};

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

const distributorRepository = new InMemoryDistributorRepository();
const brandRepository = new InMemoryBrandRepository();

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
const seriesRepository = new SeriesRepository(ddbClient, TEST_TABLE_NAME, seriesFactory);

const fileStore = new StorageAdaptor(s3Client, 'test', thumbnailUid);
const domain = new AddEpisodeDomain(episodeRepository, episodeFactory, fileStore, seriesRepository, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

let genre: Genre;
let platform: Platform;
let category: Category;
let packageItem: Package;
let location: Location;
let provider: Provider;
let stream: Stream;

const thumbnail = 'data:image/png;base64,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';

const mock = {
  ...eventMock,
  body: {
    thumbnail,
    alternateThumbnail: thumbnail,
    name: 'Value Episodes #1',
    extId: 'value:1',
    slug: 'value:1',
    description: 'Value Episodes',
    rating: 'TV-14',
    season: '1',
    number: 1,
    duration: '00:59:00',
    contentData: 'data',
    originalAirDate: '2023-11-10T17:10:000Z',
    availableDate: 'avail-date',
    expirationDate: 'expire-date',
    cast: 'cast',
    streams: ['stream.id'],
    seriesId: SERIES_ID,
  },
};

let EMPTY_DB_CASES = [{
  mockEvent: mock,
  expected: {
    body: '{"error":"Invalid dependencies: Error: streams"}',
    statusCode: 422,
  },
}, {
  mockEvent: eventMock,
  expected: {
    body: '',
    statusCode: 500,
  },
}];

let NON_EMPTY_DB_CASES = [{
  mockEvent: mock,
  expected: {
    body: '',
    headers: {
      Location: `/episodes/${EPISODE_ID}`,
    },
    statusCode: 201,
  },
}, {
  mockEvent: {
    ...mock,
    body: {
      ...mock.body,
      seriesId: 'fakeId',
      slug: 'newslug',
    },
  },
  expected: {
    body: '{"error":"Invalid Series: Error: Series not Found."}',
    statusCode: 422,
  },
}, {
  mockEvent: mock,
  expected: {
    body: '{"error":"Episode already exist"}',
    statusCode: 409,
  },
}, {
  mockEvent: {
    ...mock,
    body: {
      ...mock.body,
      thumbnail: 'invalid-thumbnail',
    },
  },
  expected: {
    body: '{"error":"Invalid Base64 Thumbnail (Mime is required)"}',
    statusCode: 400,
  },
}];

beforeAll(async () => {
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

  mock.body.streams[0] = stream.id;
  EMPTY_DB_CASES = EMPTY_DB_CASES.map((event) => ({
    ...event,
    mockEvent: mock,
  }));
  NON_EMPTY_DB_CASES = NON_EMPTY_DB_CASES.map((event) => ({
    ...event,
    mockEvent: mock,
  }));
});

beforeEach(() => {
  s3Mock.reset();
});

describe('addEpisode - ApiGatewayAdaptor awsMock', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await locationRepository.save(location);
    await providerRepository.save(provider);
    await seriesRepository.save(await seriesFactory.toDomain({
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
    }));
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe.each(EMPTY_DB_CASES)('handler - missing dependencies', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      s3Mock.on(PutObjectCommand).resolves({});
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
    });
  });
});

describe('addEpisode - ApiGatewayAdaptor', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');

    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await locationRepository.save(location);
    await providerRepository.save(provider);
    await seriesRepository.save(await seriesFactory.toDomain({
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
    }));
    await streamRepository.save(stream);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('should return throw an UnableToSaveThumbnail error', async () => {
    s3Mock.on(PutObjectCommand).rejects({});
    // @ts-ignore
    expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
      body: '{"error":"Unable to save Episode thumbnail"}',
      statusCode: 422,
    });
  });

  describe.each(NON_EMPTY_DB_CASES)('handler - create and episode already exists', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);

      const episodeItem = await episodeRepository.findOne(EPISODE_ID);
      expect(episodeItem?.thumbnail.value()).toEqual(`episodes/${EPISODE_ID}/thumbnail.png`);
    });
  });

  it('should throw episode stream creation error', async () => {
    // @ts-ignore
    expect(await apiGatewayAdaptor.handler({
      ...NON_EMPTY_DB_CASES[0].mockEvent,
      // @ts-ignore
      body: {
        ...NON_EMPTY_DB_CASES[0].mockEvent.body,
        // @ts-ignore
        streams: [{
          extId: 'provider-extId',
          name: 'Provider Reelz_SD',
          type: StreamType.STREAM,
          format: StreamFormat.HLS,
          daiParams: true,
          data: 'my-stream-data',
        }],
      },
    })).toStrictEqual({
      body: '{"error":"Unable to create Episode Stream, extId already taken"}',
      statusCode: 422,
    });
  });
});
