import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../../utils/database-table-utils';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../../utils/in-memory-relation-repositories';
import { MovieRating } from '../../../../asset/shared/Rating';
import Category from '../../../../category/shared/Category';
import CategoryMap from '../../../../category/shared/CategoryMap';
import CategoryRepository from '../../../../category/shared/CategoryRepository';
import Stream from '../../../../stream/shared/Stream';
import StreamFactory from '../../../../stream/shared/StreamFactory';
import StreamRepository from '../../../../stream/shared/StreamRepository';
import Genre from '../../../../genre/shared/Genre';
import Location from '../../../../location/shared/Location';
import Package from '../../../../package/shared/Package';
import Platform from '../../../../platform/shared/Platform';
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
import { MovieRequestDto } from '../../../../shared/dto/vod/MovieDto';
import { StreamFormat, StreamType } from '../../../../shared/dto/StreamDto';
import { LocationType } from '../../../../shared/dto/LocationDto';
import { RevenueModel, PackageType } from '../../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../../shared/dto/ProviderDto';
import Movie from '../Movie';
import { MovieError } from '../MovieError';
import MovieFactory from '../MovieFactory';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const TEST_TABLE_NAME = 'test-movieFactory';

const uid = new UIDGenerator();

const uidMovie = {
  generate: () => 'my-movie-id',
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

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('MovieFactory', () => {
  let genre: Genre;
  let platform: Platform;
  let category: Category;
  let packageItem: Package;
  let location: Location;
  let provider: Provider;
  let movieDto: MovieRequestDto;
  let movie: Movie;
  let stream: Stream;
  const existingDistributorIds = ['13', '28', '36'];
  const existingBrandIds = ['118', '131', '237'];
  let movieFactory: MovieFactory;

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

    movieDto = {
      extId: 'movie-extId',
      description: 'Test movie',
      name: 'Reelz_SD',
      rating: MovieRating.PG,
      availableDate: '2022-11-10T17:10:000Z',
      expirationDate: '2023-11-10T17:10:000Z',
      slug: 'reelz-sd',
      vastId: '',
      thumbnail: 'movies/movieid/thumbnail.png',
      alternateThumbnail: 'movies/movieid/thumbnail.png',
      backgroundThumbnail: 'movies/movieid/thumbnail.png',
      provider: '',
      packages: [],
      categories: [],
      brands: [],
      streams: [],
      platforms: [],
    };

    movieFactory = new MovieFactory(
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

    await providerRepository.save(provider);
    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await genreRepository.save(genre);
    await streamRepository.save(stream);
  });

  afterAll(async () => {
    await providerRepository.remove(provider);
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  // it('toDomain - should throw because of unknown provider', async () => {
  //   await expect(async () => movieFactory.toDomain({
  //     ...movieDto,
  //   })).rejects.toThrowError(MovieError.UnknownMovieDependency);
  // });

  // it('toDomain - should throw because of unknown platforms', async () => {
  //   await expect(async () => movieFactory.toDomain({
  //     ...movieDto,
  //     provider: 'provider-id',
  //   })).rejects.toThrowError(MovieError.UnknownMovieDependency);
  // });

  // it('toDomain - should throw because of unknown categories', async () => {
  //   await expect(async () => movieFactory.toDomain({
  //     ...movieDto,
  //     provider: 'provider-id',
  //     platforms: [platform.id],
  //   })).rejects.toThrowError(MovieError.UnknownMovieDependency);
  // });

  // it('toDomain - should throw because of unknown packages', async () => {
  //   await expect(async () => movieFactory.toDomain({
  //     ...movieDto,
  //     provider: 'provider-id',
  //     platforms: [platform.id],
  //     categories: [category.id],
  //   })).rejects.toThrowError(MovieError.UnknownMovieDependency);
  // });

  // it('toDomain - should throw because of unknown brands', async () => {
  //   await expect(async () => movieFactory.toDomain({
  //     ...movieDto,
  //     provider: 'provider-id',
  //     platforms: [platform.id],
  //     categories: [category.id],
  //     packages: [packageItem.id],
  //   })).rejects.toThrowError(MovieError.UnknownMovieDependency);
  // });

  it('toDomain - should throw because of unknown streams', async () => {
    await expect(async () => movieFactory.toDomain({
      ...movieDto,
      provider: 'provider-id',
      categories: [category.id],
      packages: [packageItem.id],
      brands: existingBrandIds,
      streams: ['unknown-stream-id'],
    })).rejects.toThrowError(MovieError.UnknownMovieDependency);
  });

  it('toDomain - should create a Movie instance', async () => {
    movie = await movieFactory.toDomain({
      ...movieDto,
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      brands: existingBrandIds,
      streams: [stream.id],
    });

    expect(movie).toBeDefined();
    expect(movie.id).toEqual('my-movie-id');
  });

  it('toDomain - should throw when handling relations', async () => {
    await expect(async () => movieFactory.toDomain({
      ...movieDto,
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [stream.id],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    })).rejects.toThrowError(MovieError.UnknownMovieDependency);
  });

  it('toDomain - should create a new Stream from StreamProps', async () => {
    await locationRepository.save(location);
    const newStream = {
      name: 'my-new-movie-stream',
      extId: 'new-movie-stream',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: 'data',
      daiParams: true,
      weight: 1,
    };

    movie = await movieFactory.toDomain({
      ...movieDto,
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [newStream],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    });

    expect(movie).toBeDefined();
    expect(movie.id).toEqual('my-movie-id');
    expect(movie.streams?.length).toEqual(1);
    if (!movie.streams) return;
    expect(await streamRepository.findOne(movie.streams[0].id)).toBeDefined();
  });

  it('toDomain - should throw because Stream extId already exists', async () => {
    const newStream = {
      name: 'my-new-movie-stream-2',
      extId: 'new-movie-stream',
      type: StreamType.EMBED_CODE,
      format: StreamFormat.DASH,
      data: 'data2',
      daiParams: false,
      weight: 1,
    };
    const stream2 = {
      name: 'my-new-movie-stream-2',
      extId: 'new-movie-stream',
      type: StreamType.EMBED_CODE,
      format: StreamFormat.DASH,
      data: 'data2',
      daiParams: false,
      weight: 1,
    };

    await expect(async () => movieFactory.toDomain({
      ...movieDto,
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [newStream, stream2],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    })).rejects.toThrowError(MovieError.MovieStreamCreation);
  });

  it('toDomain - should create a Movie instance', async () => {
    movie = await movieFactory.toDomain({
      ...movieDto,
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [stream.id],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    });

    expect(movie).toBeDefined();
    expect(movie.id).toEqual('my-movie-id');
  });

  it('toPersistance - should return correct ids', async () => {
    const resMovie = movieFactory.toPersistence(movie);

    expect(resMovie).toBeDefined();
    expect(resMovie.id).toEqual('my-movie-id');
    expect(resMovie.provider).toEqual('provider-id');
    expect(resMovie.platforms).toContain('platform-id');
    expect(resMovie.categories).toContain('category-id');
    expect(resMovie.packages).toContain('package-id');
    expect(resMovie.genres).toContain('genre-id');
    expect(resMovie.locations).toContain('location-id');
    expect(resMovie.streams).toContain('stream-id');
    expect(resMovie.distributors).toContain(existingDistributorIds[0]);
    expect(resMovie.brands).toContain(existingBrandIds[0]);
  });

  it('sortByName - should sort correctly', async () => {
    expect(MovieFactory.sortByName(provider, genre)).toEqual(-1);
    expect(MovieFactory.sortByName(genre, provider)).toEqual(1);
    expect(MovieFactory.sortByName(genre, genre)).toEqual(0);
  });
});
