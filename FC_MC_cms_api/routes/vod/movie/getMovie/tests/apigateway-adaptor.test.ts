import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../../utils/database-table-utils';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../../utils/in-memory-relation-repositories';
import { MovieRating } from '../../../../asset/shared/Rating';
import Category from '../../../../category/shared/Category';
import CategoryMap from '../../../../category/shared/CategoryMap';
import CategoryRepository from '../../../../category/shared/CategoryRepository';
import Stream from '../../../../stream/shared/Stream';
import Movie from '../../shared/Movie';
import StreamFactory from '../../../../stream/shared/StreamFactory';
import StreamRepository from '../../../../stream/shared/StreamRepository';
import Location from '../../../../location/shared/Location';
import Package from '../../../../package/shared/Package';
import Platform from '../../../../platform/shared/Platform';
import Genre from '../../../../genre/shared/Genre';
import GenreMap from '../../../../genre/shared/GenreMap';
import GenreRepository from '../../../../genre/shared/GenreRepository';
import LocationFactory from '../../../../location/shared/LocationFactory';
import LocationRepository from '../../../../location/shared/LocationRepository';
import PackageFactory from '../../../../package/shared/PackageFactory';
import PackageRepository from '../../../../package/shared/PackageRepository';
import PlatformMap from '../../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../../platform/shared/PlatformRepository';
import Provider from '../../../../provider/shared/Provider';
import ProviderMap from '../../../../provider/shared/ProviderMap';
import ProviderRepository from '../../../../provider/shared/ProviderRepository';
import { StreamFormat, StreamType } from '../../../../shared/dto/StreamDto';
import { LocationType } from '../../../../shared/dto/LocationDto';
import {
  RevenueModel, PackageType,
} from '../../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../../shared/dto/ProviderDto';
import MovieFactory from '../../shared/MovieFactory';
import eventMock from '../../shared/tests/event-mock';
import GetMovieDomain from '../GetMovieDomain';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import MovieRepository from '../../shared/MovieRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-GetMovieAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const MOVIE_ID = 'my-movie-id';

const uid = new UIDGenerator();

const uidMovie = {
  generate: () => MOVIE_ID,
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

const movieFactory = new MovieFactory(
  uidMovie,
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

const movieRepository = new MovieRepository(ddbClient, TEST_TABLE_NAME, movieFactory);

const domain = new GetMovieDomain(movieRepository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const handlerPayloadMock = {
  ...eventMock,
  pathParameters: {
    id: MOVIE_ID,
  },
};

const CASES = [{
  mockEvent: {
    ...handlerPayloadMock,
    pathParameters: { id: MOVIE_ID },
  },
  expected: {
    body: '',
    statusCode: 200,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: MOVIE_ID } },
  expected: {
    body: '',
    statusCode: 200,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: 'random' } },
  expected: {
    body: '{"error":"Movie Not Found"}',
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

describe('Get Movie ApiGatewayAdaptor', () => {
  let genre: Genre;
  let platform: Platform;
  let category: Category;
  let packageItem: Package;
  let location: Location;
  let provider: Provider;
  let stream: Stream;
  let movie: Movie;
  let count = 3;

  const movieDto = {
    extId: 'movie-extId',
    description: 'Test movie',
    name: 'Reelz_SD',
    rating: MovieRating.NOT_RATED,
    availableDate: '2022-11-10T17:10:000Z',
    expirationDate: '2023-11-10T17:10:000Z',
    slug: 'reelz-sd',
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

    await providerRepository.save(provider);
    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await genreRepository.save(genre);
    await locationRepository.save(location);
    await streamRepository.save(stream);

    const streamProps = {
      name: 'my-new-movie-stream',
      extId: 'new-movie-stream',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: 'data',
      daiParams: true,
      weight: 1,
    };

    const existingDistributorIds = ['13', '28', '36'];
    const existingBrandIds = ['118', '131', '237'];

    movie = await movieFactory.toDomain({
      ...movieDto,
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [stream.id, streamProps],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    });

    await movieRepository.save(movie);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    beforeAll(async () => {
      CASES[0].expected.body = JSON.stringify(movie);
      if (count > 1) {
        const movie2 = await movieFactory.toDomain(
          await movieFactory.toPersistence(movie),
        );
        CASES[1].expected.body = JSON.stringify(movie2);
      }
    });
    afterAll(async () => {
      count -= 1;
    });

    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      const response = await apiGatewayAdaptor.handler(mockEvent);
      expect(response.statusCode).toStrictEqual(expected.statusCode);
      if (response.statusCode !== 500) {
        expect(JSON.parse(response.body)).toStrictEqual(JSON.parse(expected.body));
      } else {
        expect(response.body).toStrictEqual(expected.body);
      }
    });
  });
});
