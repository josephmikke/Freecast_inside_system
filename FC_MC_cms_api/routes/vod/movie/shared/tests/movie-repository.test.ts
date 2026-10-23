import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../../utils/database-table-utils';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../../utils/in-memory-relation-repositories';
import { MovieRating } from '../../../../asset/shared/Rating';
import Category from '../../../../category/shared/Category';
import CategoryMap from '../../../../category/shared/CategoryMap';
import CategoryRepository from '../../../../category/shared/CategoryRepository';
import HttpClientAdaptor from '../../../../epg/shared/HttpClientAdaptor';
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
import { SortType, SortOrder } from '../../../../shared/dto/ChannelDto';
import { LocationType } from '../../../../shared/dto/LocationDto';
import { MrssType } from '../../../../shared/dto/MrssDto';
import {
  RevenueModel, PackageType,
} from '../../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../../shared/dto/ProviderDto';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { StreamFormat, StreamProps, StreamType } from '../../../../shared/dto/StreamDto';
import Stream from '../../../../stream/shared/Stream';
import StreamFactory from '../../../../stream/shared/StreamFactory';
import StreamRepository from '../../../../stream/shared/StreamRepository';
import ImageAdaptor from '../../../shared/imageAdaptor/ImageAdaptor';
import Movie from '../Movie';
import MovieFactory from '../MovieFactory';
import MovieRepository from '../MovieRepository';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const TEST_TABLE_NAME = 'test-movieRepository';

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

const movieFactoryRdm = new MovieFactory(
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

const movieDto = {
  extId: 'movie-extId',
  catchUpActive: false,
  description: 'Test movie',
  name: 'Reelz_SD',
  rating: MovieRating.PG_13,
  availableDate: '2022-11-10T17:10:000Z',
  expirationDate: '2023-11-10T17:10:000Z',
  slug: 'reelz-sd',
  vastId: '',
  mediapackageId: 'mediapackage-id',
  thumbnail: 'movies/movieid/thumbnail.png',
  alternateThumbnail: 'movies/movieid/thumbnail.png',
  backgroundThumbnail: 'movies/movieid/thumbnail.png',
  provider: '',
  platforms: [],
  packages: [],
  categories: [],
  brands: [],
  exclude: '',
  streams: [],
};

describe('MovieRepository - Empty database', () => {
  const movie = Movie.create({
    ...movieDto,
    createdAt: '2022-10-17T00:00:00.000Z',
    updatedAt: '2022-10-17T00:00:00.000Z',
    extId: movieDto.extId ?? '',
    imdbId: '',
    tmdbId: '',
    contentData: '',
    releaseYear: '',
    vastId: movieDto.vastId ?? '',
    exclude: '',
    cast: '',
    enabled: true,
    isIngest: false,
  }, 'movie-id');

  beforeEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('should check if a Movie exists and return false', async () => {
    expect(await movieRepository.exists(movie)).toBeFalsy();
  });

  it('should return all an empty array', async () => {
    expect(await movieRepository.findAll()).toEqual({ movies: [], nextToken: undefined });
  });

  it('should return false if not relationships are found', async () => {
    expect(await movieRepository.hasRelationships(movie)).toBeFalsy();
  });

  it('should return false if cannot save', async () => {
    expect(await movieRepository.save(movie)).toBeTruthy();
  });

  it('should return undefined if not found', async () => {
    expect(await movieRepository.findOne(movie.id)).toBeUndefined();
  });

  it('should return empty array if not found', async () => {
    expect(await movieRepository.findMany([movie.id])).toEqual([]);
  });
});

describe('MovieRepository - Non-Empty database', () => {
  let genre: Genre;
  let platform: Platform;
  let category: Category;
  let packageItem: Package;
  let location: Location;
  let provider: Provider;
  let movie: Movie;
  let stream: Stream;
  const existingDistributorIds = ['13', '28', '36'];
  const existingBrandIds = ['118', '131', '237'];

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    genre = Genre.create({
      extId: 'reelz_sd',
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
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('save - should save a Movie instance', async () => {
    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await genreRepository.save(genre);
    await locationRepository.save(location);
    await streamRepository.save(stream);

    const streamProps: StreamProps = {
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
      streams: [stream.id, streamProps],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
      availableDate: '2022-09-17T00:00:00.000Z',
      expirationDate: '2022-12-17T00:00:00.000Z',
    });

    expect(await movieRepository.save(movie)).toBeTruthy();
  });

  it('findOne - should get previously saved Movie instance', async () => {
    const resultMovie = await movieRepository.findOne(movie.id);

    expect(resultMovie).toBeDefined();
    expect(resultMovie?.id).toEqual(movie.id);
  });

  it('findAll - should get previously saved Movie instances', async () => {
    const movie2 = await movieFactoryRdm.toDomain({
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
      name: 'movie_name_123',
      slug: 'value_movie',
      createdAt: '2022-09-17T00:00:00.000Z',
      updatedAt: '2022-11-17T00:00:00.000Z',
    });
    await movieRepository.save(movie2);

    // Default: sort by Name, ascending order
    let resultMovie = await movieRepository.findAll();

    expect(resultMovie.movies.length).toEqual(2);
    expect(resultMovie.movies[0].name).toEqual(movie2.name);

    // sort by Name, ascending order
    resultMovie = await movieRepository.findAll({
      sort: {
        attr: SortType.NAME,
        order: SortOrder.ASC,
      },
    });

    expect(resultMovie.movies.length).toEqual(2);
    expect(resultMovie.movies[0].name).toEqual(movie2.name);

    // sort by Name, descending order
    resultMovie = await movieRepository.findAll({
      sort: {
        attr: SortType.NAME,
        order: SortOrder.DESC,
      },
    });

    expect(resultMovie.movies.length).toEqual(2);
    expect(resultMovie.movies[0].name).toEqual(movie.name);

    // sort by Id (slug), ascending order
    resultMovie = await movieRepository.findAll({
      sort: {
        attr: SortType.ID,
        order: SortOrder.ASC,
      },
    });

    expect(resultMovie.movies.length).toEqual(2);
    expect(resultMovie.movies[0].slug).toEqual(movie.slug);

    // sort by Id (slug), descending order
    resultMovie = await movieRepository.findAll({
      sort: {
        attr: SortType.ID,
        order: SortOrder.DESC,
      },
    });

    expect(resultMovie.movies.length).toEqual(2);
    expect(resultMovie.movies[0].slug).toEqual(movie2.slug);

    // sort by creation date, ascending order
    resultMovie = await movieRepository.findAll({
      sort: {
        attr: SortType.CREATED,
        order: SortOrder.ASC,
      },
    });

    expect(resultMovie.movies.length).toEqual(2);
    expect(resultMovie.movies[0].createdAt).toEqual(movie2.createdAt);

    // sort by creation date, descending order
    resultMovie = await movieRepository.findAll({
      sort: {
        attr: SortType.CREATED,
        order: SortOrder.DESC,
      },
    });

    expect(resultMovie.movies.length).toEqual(2);
    expect(resultMovie.movies[0].createdAt).toEqual(movie.createdAt);

    // sort by updated date, ascending order
    resultMovie = await movieRepository.findAll({
      sort: {
        attr: SortType.UPDATED,
        order: SortOrder.ASC,
      },
    });

    expect(resultMovie.movies.length).toEqual(2);
    expect(resultMovie.movies[0].updatedAt).toEqual(movie.updatedAt);

    // sort by updated date, descending order
    resultMovie = await movieRepository.findAll({
      sort: {
        attr: SortType.UPDATED,
        order: SortOrder.DESC,
      },
    });

    expect(resultMovie.movies.length).toEqual(2);
    expect(resultMovie.movies[0].updatedAt).toEqual(movie2.updatedAt);

    // Default: sort by Name, ascending order, with search
    resultMovie = await movieRepository.findAll({
      search: 'name',
    });

    expect(resultMovie.movies.length).toEqual(1);
    expect(resultMovie.movies[0].name).toEqual(movie2.name);

    // Default: sort by Name, ascending order, with unknown search
    resultMovie = await movieRepository.findAll({
      search: 'unknown',
    });

    expect(resultMovie.movies.length).toEqual(0);

    // Default: sort visible, ascending order
    resultMovie = await movieRepository.findAll({
      filter: {
        active: true,
      },
    });

    expect(resultMovie.movies.length).toEqual(1);
    expect(resultMovie.movies[0].name).toEqual(movie.name);

    // Default: sort visible, ascending order
    resultMovie = await movieRepository.findAll({
      filter: {
        active: false,
      },
    });

    expect(resultMovie.movies.length).toEqual(1);
    expect(resultMovie.movies[0].name).toEqual(movie2.name);

    // Default: sort visible + name, ascending order
    resultMovie = await movieRepository.findAll({
      filter: {
        active: false,
      },
      search: 'name',
    });

    expect(resultMovie.movies.length).toEqual(1);
    expect(resultMovie.movies[0].name).toEqual(movie2.name);

    // Default: sort visible + name, ascending order
    resultMovie = await movieRepository.findAll({
      filter: {
        active: true,
      },
      search: 'name',
    });

    expect(resultMovie.movies.length).toEqual(0);

    // Default: sort visible + name, ascending order
    resultMovie = await movieRepository.findAll({
      filter: {
        packages: [packageItem.id],
        providers: ['provider-id'],
      },
    });

    expect(resultMovie.movies.length).toEqual(2);

    // Default: sort visible + name, ascending order
    resultMovie = await movieRepository.findAll({
      filter: {
        platforms: ['unknown-id'],
      },
    });

    expect(resultMovie.movies.length).toEqual(0);

    // Default: sort visible + name, ascending order
    resultMovie = await movieRepository.findAll({
      filter: {
        platforms: [platform.id],
      },
    });

    expect(resultMovie.movies.length).toEqual(2);

    // Default: sort visible + name, ascending order
    resultMovie = await movieRepository.findAll({
      filter: {
        active: false,
        platforms: [platform.id],
      },
    });

    expect(resultMovie.movies.length).toEqual(1);
    expect(resultMovie.movies[0].name).toEqual(movie2.name);

    // Default: sort visible + name, ascending order
    resultMovie = await movieRepository.findAll({
      filter: {
        categories: [category.id],
      },
      search: 'reel',
    });

    expect(resultMovie.movies.length).toEqual(1);
    expect(resultMovie.movies[0].name).toEqual(movie.name);

    // Limit parameter
    resultMovie = await movieRepository.findAll({
      limit: 2,
    });
    expect(resultMovie.movies.length).toEqual(2);
    const token = {
      SK: `ASSET#${MovieFactory.ROOT_ENTITY}#my-movie-id`,
      'GSI1-SK': 'reelz_sd',
      PK: `ASSET#${MovieFactory.ROOT_ENTITY}#my-movie-id`,
      'GSI1-PK': `ASSET#${MovieFactory.ROOT_ENTITY}`,
    };
    expect(resultMovie.nextToken).toEqual(Buffer.from(JSON.stringify(token)).toString('base64'));
    resultMovie = await movieRepository.findAll({
      nextToken: resultMovie.nextToken,
    });
    expect(resultMovie.movies).toHaveLength(0);
    expect(resultMovie.nextToken).toBeUndefined();

    await movieRepository.save(await movieFactoryRdm.ingestToDomain({
      guid: 'my-movie-guid',
      extId: 'my-movie-guid',
      title: 'movie number one test',
      thumbnails: [],
      pubDate: 'string',
      description: 'string',
      type: MrssType.MOVIE,
      asset: {
        height: '1080',
        width: '1920',
        duration: '60',
        type: 'video/mp4',
        url: 'https://partnerfeeds.besteverchannels.com/SelectTV/assets/the-supermodel-8eb1119a.mp4',
      },
      avail: {
        start: '2022-09-17T00:00:00.000Z',
        end: '2022-09-23T00:00:00.000Z',
      },
      genres: ['A New doMain', 'Reelz_SD'],
      subtitles: [],
      cuePoints: [],
      movieAltThumbnail: {},
      movieBackgroundThumbnail: {},
      movieMainThumbnail: {},
    }, new ImageAdaptor(new HttpClientAdaptor())));
    const allMovies = await movieRepository.findAll();
    expect(allMovies.movies.length).toEqual(3);

    expect(allMovies.movies.filter((movieItem) => movieItem.genres?.length).length).toEqual(3);
  });

  it('findMany - should get previously saved Movie instances', async () => {
    const resultMovie = await movieRepository.findMany([movie.id]);

    expect(resultMovie.length).toBeGreaterThan(0);
    expect(resultMovie[0].id).toEqual(movie.id);
  });

  it('remove - should remove previously saved Movie instances', async () => {
    expect(await movieRepository.remove(movie)).toBeTruthy();

    const resultMovie = await movieRepository.findOne(movie.id);
    expect(resultMovie).toBeUndefined();
  });
});

describe.each([
  (payload: Movie) => movieRepository.remove(payload),
  (payload: Movie) => movieRepository.save(payload),
  (payload: Movie) => movieRepository.exists(payload),
  (payload: Movie) => movieRepository.hasRelationships(payload),
  (id: string) => movieRepository.findOne(id),
  // () => movieRepository.findMany([]),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
