import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

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
import { RevenueModel, PackageType } from '../../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../../shared/dto/ProviderDto';
import { SeriesRequestDto } from '../../../../shared/dto/vod/SeriesDto';
import StreamFactory from '../../../../stream/shared/StreamFactory';
import StreamRepository from '../../../../stream/shared/StreamRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import EpisodeFactory from '../../../episode/shared/EpisodeFactory';
import EpisodeRepository from '../../../episode/shared/EpisodeRepository';
import Series from '../Series';
import { SeriesError } from '../SeriesError';
import SeriesFactory from '../SeriesFactory';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const TEST_TABLE_NAME = 'test-seriesFactory';

const uid = new UIDGenerator();

const uidSeries = {
  generate: () => 'my-series-id',
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
const episodeRepository = new EpisodeRepository(ddbClient, TEST_TABLE_NAME, episodeFactory);

const distributorRepository = new InMemoryDistributorRepository();

const brandRepository = new InMemoryBrandRepository();

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('SeriesFactory', () => {
  let genre: Genre;
  let platform: Platform;
  let category: Category;
  let packageItem: Package;
  let location: Location;
  let provider: Provider;
  let seriesDto: SeriesRequestDto;
  let series: Series;
  const existingDistributorIds = ['13', '28', '36'];
  const existingBrandIds = ['118', '131', '237'];
  let seriesFactory: SeriesFactory;

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

    seriesDto = {
      extId: 'series-extId',
      description: 'Test series',
      name: 'Reelz_SD',
      rating: MovieRating.PG,
      availableDate: '2022-11-10T17:10:000Z',
      expirationDate: '2023-11-10T17:10:000Z',
      slug: 'reelz-sd',
      vastId: '',
      thumbnail: 'series/seriesid/thumbnail.png',
      alternateThumbnail: 'series/seriesid/thumbnail.png',
      backgroundThumbnail: 'series/seriesid/thumbnail.png',
      provider: '',
      packages: [],
      categories: [],
      brands: [],
      episodes: [],
      platforms: [],
    };

    seriesFactory = new SeriesFactory(
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

    await providerRepository.save(provider);
    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await genreRepository.save(genre);
  });

  afterAll(async () => {
    await providerRepository.remove(provider);
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  /* it('toDomain - should throw because of unknown provider', async () => {
    await expect(async () => seriesFactory.toDomain({
      ...seriesDto,
    })).rejects.toThrowError(SeriesError.UnknownSeriesDependency);
  });

  it('toDomain - should throw because of unknown platforms', async () => {
    await expect(async () => seriesFactory.toDomain({
      ...seriesDto,
      provider: 'provider-id',
    })).rejects.toThrowError(SeriesError.UnknownSeriesDependency);
  });

  it('toDomain - should throw because of unknown categories', async () => {
    await expect(async () => seriesFactory.toDomain({
      ...seriesDto,
      provider: 'provider-id',
      platforms: [platform.id],
    })).rejects.toThrowError(SeriesError.UnknownSeriesDependency);
  });

  it('toDomain - should throw because of unknown packages', async () => {
    await expect(async () => seriesFactory.toDomain({
      ...seriesDto,
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
    })).rejects.toThrowError(SeriesError.UnknownSeriesDependency);
  });

  it('toDomain - should throw because of unknown brands', async () => {
    await expect(async () => seriesFactory.toDomain({
      ...seriesDto,
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
    })).rejects.toThrowError(SeriesError.UnknownSeriesDependency);
  }); */

  it('toDomain - should create a Series instance', async () => {
    series = await seriesFactory.toDomain({
      ...seriesDto,
      provider: 'provider-id',
      categories: [category.id],
      packages: [packageItem.id],
      brands: existingBrandIds,
      episodes: [],
    });

    expect(series).toBeDefined();
    expect(series.id).toEqual('my-series-id');
  });

  it('toDomain - should throw when handling relations', async () => {
    await expect(async () => seriesFactory.toDomain({
      ...seriesDto,
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      episodes: [],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    })).rejects.toThrowError(SeriesError.UnknownSeriesDependency);
  });

  it('toDomain - should create a Series instance', async () => {
    await locationRepository.save(location);
    series = await seriesFactory.toDomain({
      ...seriesDto,
      provider: 'provider-id',
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      episodes: [],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    });

    expect(series).toBeDefined();
    expect(series.id).toEqual('my-series-id');
  });

  it('toPersistance - should return correct ids', async () => {
    const resSeries = seriesFactory.toPersistence(series);

    expect(resSeries).toBeDefined();
    expect(resSeries.id).toEqual('my-series-id');
    expect(resSeries.provider).toEqual('provider-id');
    expect(resSeries.platforms).toContain('platform-id');
    expect(resSeries.categories).toContain('category-id');
    expect(resSeries.packages).toContain('package-id');
    expect(resSeries.genres).toContain('genre-id');
    expect(resSeries.locations).toContain('location-id');
    expect(resSeries.distributors).toContain(existingDistributorIds[0]);
    expect(resSeries.brands).toContain(existingBrandIds[0]);
  });

  it('sortByName - should sort correctly', async () => {
    expect(SeriesFactory.sortByName(provider, genre)).toEqual(-1);
    expect(SeriesFactory.sortByName(genre, provider)).toEqual(1);
    expect(SeriesFactory.sortByName(genre, genre)).toEqual(0);
  });
});
