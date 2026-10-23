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

import StreamFactory from '../../../../stream/shared/StreamFactory';
import StreamRepository from '../../../../stream/shared/StreamRepository';
import EpisodeFactory from '../../../episode/shared/EpisodeFactory';
import EpisodeRepository from '../../../episode/shared/EpisodeRepository';
import ImageAdaptor from '../../../shared/imageAdaptor/ImageAdaptor';
import Series from '../Series';
import SeriesFactory from '../SeriesFactory';
import SeriesRepository from '../SeriesRepository';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const TEST_TABLE_NAME = 'test-seriesRepository';

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

const seriesFactoryRdm = new SeriesFactory(
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

const seriesDto = {
  extId: 'series-extId',
  catchUpActive: false,
  description: 'Test series',
  name: 'Reelz_SD',
  rating: MovieRating.PG_13,
  availableDate: '2022-11-10T17:10:000Z',
  expirationDate: '2023-11-10T17:10:000Z',
  slug: 'reelz-sd',
  vastId: '',
  mediapackageId: 'mediapackage-id',
  thumbnail: 'series/seriesid/thumbnail.png',
  alternateThumbnail: 'series/seriesid/thumbnail.png',
  backgroundThumbnail: 'series/seriesid/thumbnail.png',
  provider: '',
  platforms: [],
  packages: [],
  categories: [],
  brands: [],
  exclude: '',
  streams: [],
};

describe('SeriesRepository - Empty database', () => {
  const series = Series.create({
    ...seriesDto,
    createdAt: '2022-10-17T00:00:00.000Z',
    updatedAt: '2022-10-17T00:00:00.000Z',
    extId: seriesDto.extId ?? '',
    imdbId: '',
    tmdbId: '',
    contentData: '',
    releaseYear: '',
    vastId: seriesDto.vastId ?? '',
    exclude: '',
    cast: '',
    enabled: true,
    isIngest: false,
  }, 'series-id');

  beforeEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('should check if a Series exists and return false', async () => {
    expect(await seriesRepository.exists(series)).toBeFalsy();
  });

  it('should return all an empty array', async () => {
    expect(await seriesRepository.findAll()).toEqual({ series: [], nextToken: undefined });
  });

  it('should return false if not relationships are found', async () => {
    expect(await seriesRepository.hasRelationships(series)).toBeFalsy();
  });

  it('should return false if cannot save', async () => {
    expect(await seriesRepository.save(series)).toBeTruthy();
  });

  it('should return undefined if not found', async () => {
    expect(await seriesRepository.findOne(series.id)).toBeUndefined();
  });

  it('should return empty array if not found', async () => {
    expect(await seriesRepository.findMany([series.id])).toEqual([]);
  });
});

describe('SeriesRepository - Non-Empty database', () => {
  let genre: Genre;
  let platform: Platform;
  let category: Category;
  let packageItem: Package;
  let location: Location;
  let provider: Provider;
  let series: Series;
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

  it('save - should save a Series instance', async () => {
    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await genreRepository.save(genre);
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
      availableDate: '2022-09-17T00:00:00.000Z',
      expirationDate: '2022-12-17T00:00:00.000Z',
    });

    expect(await seriesRepository.save(series)).toBeTruthy();
  });

  it('findOne - should get previously saved Series instance', async () => {
    const resultSeries = await seriesRepository.findOne(series.id);

    expect(resultSeries).toBeDefined();
    expect(resultSeries?.id).toEqual(series.id);
  });

  it('findAll - should get previously saved Series instances', async () => {
    const series2 = await seriesFactoryRdm.toDomain({
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
      name: 'first_name_123',
      slug: 'value_series',
      createdAt: '2022-09-17T00:00:00.000Z',
      updatedAt: '2022-11-17T00:00:00.000Z',
      // The active filter matches on the enabled flag, not on availability dates
      enabled: false,
    });
    await seriesRepository.save(series2);

    // Default: sort by Name, ascending order
    let resultSeries = await seriesRepository.findAll();

    expect(resultSeries.series.length).toEqual(2);
    expect(resultSeries.series[0].name).toEqual(series2.name);

    // sort by Name, ascending order
    resultSeries = await seriesRepository.findAll({
      sort: {
        attr: SortType.NAME,
        order: SortOrder.ASC,
      },
    });

    expect(resultSeries.series.length).toEqual(2);
    expect(resultSeries.series[0].name).toEqual(series2.name);

    // sort by Name, descending order
    resultSeries = await seriesRepository.findAll({
      sort: {
        attr: SortType.NAME,
        order: SortOrder.DESC,
      },
    });

    expect(resultSeries.series.length).toEqual(2);
    expect(resultSeries.series[0].name).toEqual(series.name);

    // sort by Id (slug), ascending order
    resultSeries = await seriesRepository.findAll({
      sort: {
        attr: SortType.ID,
        order: SortOrder.ASC,
      },
    });

    expect(resultSeries.series.length).toEqual(2);
    expect(resultSeries.series[0].slug).toEqual(series.slug);

    // sort by Id (slug), descending order
    resultSeries = await seriesRepository.findAll({
      sort: {
        attr: SortType.ID,
        order: SortOrder.DESC,
      },
    });

    expect(resultSeries.series.length).toEqual(2);
    expect(resultSeries.series[0].slug).toEqual(series2.slug);

    // sort by creation date, ascending order
    resultSeries = await seriesRepository.findAll({
      sort: {
        attr: SortType.CREATED,
        order: SortOrder.ASC,
      },
    });

    expect(resultSeries.series.length).toEqual(2);
    expect(resultSeries.series[0].createdAt).toEqual(series2.createdAt);

    // sort by creation date, descending order
    resultSeries = await seriesRepository.findAll({
      sort: {
        attr: SortType.CREATED,
        order: SortOrder.DESC,
      },
    });

    expect(resultSeries.series.length).toEqual(2);
    expect(resultSeries.series[0].createdAt).toEqual(series.createdAt);

    // sort by updated date, ascending order
    resultSeries = await seriesRepository.findAll({
      sort: {
        attr: SortType.UPDATED,
        order: SortOrder.ASC,
      },
    });

    expect(resultSeries.series.length).toEqual(2);
    expect(resultSeries.series[0].updatedAt).toEqual(series.updatedAt);

    // sort by updated date, descending order
    resultSeries = await seriesRepository.findAll({
      sort: {
        attr: SortType.UPDATED,
        order: SortOrder.DESC,
      },
    });

    expect(resultSeries.series.length).toEqual(2);
    expect(resultSeries.series[0].updatedAt).toEqual(series2.updatedAt);

    // Default: sort by Name, ascending order, with search
    resultSeries = await seriesRepository.findAll({
      search: 'name',
    });

    expect(resultSeries.series.length).toEqual(1);
    expect(resultSeries.series[0].name).toEqual(series2.name);

    // Default: sort by Name, ascending order, with unknown search
    resultSeries = await seriesRepository.findAll({
      search: 'unknown',
    });

    expect(resultSeries.series.length).toEqual(0);

    // Default: sort visible, ascending order
    resultSeries = await seriesRepository.findAll({
      filter: {
        active: true,
      },
    });

    expect(resultSeries.series.length).toEqual(1);
    expect(resultSeries.series[0].name).toEqual(series.name);

    // Default: sort visible, ascending order
    resultSeries = await seriesRepository.findAll({
      filter: {
        active: false,
      },
    });

    expect(resultSeries.series.length).toEqual(1);
    expect(resultSeries.series[0].name).toEqual(series2.name);

    // Default: sort visible + name, ascending order
    resultSeries = await seriesRepository.findAll({
      filter: {
        active: false,
      },
      search: 'name',
    });

    expect(resultSeries.series.length).toEqual(1);
    expect(resultSeries.series[0].name).toEqual(series2.name);

    // Default: sort visible + name, ascending order
    resultSeries = await seriesRepository.findAll({
      filter: {
        active: true,
      },
      search: 'name',
    });

    expect(resultSeries.series.length).toEqual(0);

    // Default: sort visible + name, ascending order
    resultSeries = await seriesRepository.findAll({
      filter: {
        packages: [packageItem.id],
        providers: ['provider-id'],
      },
    });

    expect(resultSeries.series.length).toEqual(2);

    // Default: sort visible + name, ascending order
    resultSeries = await seriesRepository.findAll({
      filter: {
        platforms: ['unknown-id'],
      },
    });

    expect(resultSeries.series.length).toEqual(0);

    // Default: sort visible + name, ascending order
    resultSeries = await seriesRepository.findAll({
      filter: {
        platforms: [platform.id],
      },
    });

    expect(resultSeries.series.length).toEqual(2);

    // Default: sort visible + name, ascending order
    resultSeries = await seriesRepository.findAll({
      filter: {
        active: false,
        platforms: [platform.id],
      },
    });

    expect(resultSeries.series.length).toEqual(1);
    expect(resultSeries.series[0].name).toEqual(series2.name);

    // Default: sort visible + name, ascending order
    resultSeries = await seriesRepository.findAll({
      filter: {
        categories: [category.id],
      },
      search: 'reel',
    });

    expect(resultSeries.series.length).toEqual(1);
    expect(resultSeries.series[0].name).toEqual(series.name);

    // Limit parameter
    resultSeries = await seriesRepository.findAll({
      limit: 2,
    });
    expect(resultSeries.series.length).toEqual(2);
    const token = {
      SK: `ASSET#${SeriesFactory.ROOT_ENTITY}#my-series-id`,
      'GSI1-SK': 'reelz_sd',
      PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#my-series-id`,
      'GSI1-PK': `ASSET#${SeriesFactory.ROOT_ENTITY}`,
    };
    expect(resultSeries.nextToken).toEqual(Buffer.from(JSON.stringify(token)).toString('base64'));
    resultSeries = await seriesRepository.findAll({
      nextToken: resultSeries.nextToken,
    });
    expect(resultSeries.series).toHaveLength(0);
    expect(resultSeries.nextToken).toBeUndefined();

    await seriesRepository.save(await seriesFactoryRdm.ingestToDomain({
      guid: 'my-movie-guid',
      extId: 'my-movie-guid',
      title: 'movie number one test',
      thumbnails: [],
      pubDate: 'string',
      description: 'string',
      genres: ['A New doMain', 'Reelz_SD'],
      type: MrssType.SERIES,
      avail: {
        start: '',
        end: '',
      },
      seriesMainThumbnail: {},
      seriesAltThumbnail: {},
      seriesBackgroundThumbnail: {},
    }, new ImageAdaptor(new HttpClientAdaptor())));
    const allSeries = await seriesRepository.findAll();
    expect(allSeries.series.length).toEqual(3);

    expect(allSeries.series.filter((seriesItem) => seriesItem.genres?.length).length).toEqual(3);
  });

  it('findMany - should get previously saved Series instances', async () => {
    const resultSeries = await seriesRepository.findMany([series.id]);

    expect(resultSeries.length).toBeGreaterThan(0);
    expect(resultSeries[0].id).toEqual(series.id);
  });

  it('findBy (slug) - should get previously saved Series instances', async () => {
    const resultSeries = await seriesRepository.findBy('slug', 'reelz-sd');

    expect(resultSeries.length).toBeGreaterThan(0);
    expect(resultSeries[0].id).toEqual(series.id);
  });

  it('remove - should remove previously saved Series instances', async () => {
    expect(await seriesRepository.remove(series)).toBeTruthy();

    const resultSeries = await seriesRepository.findOne(series.id);
    expect(resultSeries).toBeUndefined();
  });
});

describe.each([
  (payload: Series) => seriesRepository.remove(payload),
  (payload: Series) => seriesRepository.save(payload),
  (payload: Series) => seriesRepository.exists(payload),
  (payload: Series) => seriesRepository.hasRelationships(payload),
  (id: string) => seriesRepository.findOne(id),
  // () => seriesRepository.findMany([]),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
