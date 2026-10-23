import { MovieRating, Rating } from '../../../../asset/shared/Rating';
import Brand from '../../../../brand/shared/Brand';
import Category from '../../../../category/shared/Category';
import Distributor from '../../../../distributor/shared/Distributor';
import Genre from '../../../../genre/shared/Genre';
import Location from '../../../../location/shared/Location';
import Package from '../../../../package/shared/Package';
import Platform from '../../../../platform/shared/Platform';
import Provider from '../../../../provider/shared/Provider';
import { LocationType } from '../../../../shared/dto/LocationDto';
import { PackageType, RevenueModel } from '../../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../../shared/dto/ProviderDto';
import { SeriesRequestDto } from '../../../../shared/dto/vod/SeriesDto';
import Episode from '../../../episode/shared/Episode';
import Series from '../Series';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const seriesDto: SeriesRequestDto = {
  extId: 'series-extId',
  description: 'Test series',
  name: 'Reelz_SD',
  rating: MovieRating.PG_13,
  availableDate: '2022-11-10T17:10:000Z',
  expirationDate: '2023-11-10T17:10:000Z',
  slug: 'reelz-sd',
  vastId: '',
  imdbId: '',
  tmdbId: '',
  contentData: '',
  thumbnail: 'series/myseriesid/thumbnail.png',
  alternateThumbnail: 'series/myseriesid/thumbnail.png',
  backgroundThumbnail: 'series/myseriesid/thumbnail.png',
  provider: '',
  packages: [],
  categories: [],
  brands: [],
  episodes: [],
  platforms: [],
};
let series: Series;

describe('Series creation', () => {
  it('should create a Series instance', async () => {
    series = Series.create({
      ...seriesDto,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      extId: seriesDto.extId ?? '',
      imdbId: '',
      tmdbId: '',
      contentData: '',
      cast: 'cast',
      releaseYear: '',
      expirationDate: seriesDto.expirationDate ?? '',
      vastId: seriesDto.vastId ?? '',
      exclude: '',
      enabled: true,
      isIngest: false,
    }, 'main-series-id');
    series.updateAlternateThumbnail('series/myseriesid/thumbnail.png');

    expect(series).toBeDefined();
  });
});

describe('Series methods', () => {
  it('should update Series thumbnail', async () => {
    expect(series.thumbnail).toMatchObject({ url: `${process.env.ASSETS_URL}/series/myseriesid/thumbnail.png` });

    series.updateThumbnail('path/to/thumbnail.png');

    expect(series.thumbnail).toMatchObject({ url: `${process.env.ASSETS_URL}/path/to/thumbnail.png` });
  });

  it('should update Series alternate thumbnail', async () => {
    expect(series.alternateThumbnail).toMatchObject({ url: `${process.env.ASSETS_URL}/series/myseriesid/thumbnail.png` });

    series.updateAlternateThumbnail('path/to/thumbnail.png');

    expect(series.alternateThumbnail).toMatchObject({ url: `${process.env.ASSETS_URL}/path/to/thumbnail.png` });
  });

  it('should update Series background thumbnail', async () => {
    expect(series.backgroundThumbnail).toMatchObject({ url: `${process.env.ASSETS_URL}/series/myseriesid/thumbnail.png` });

    series.updateBackgroundThumbnail('path/to/thumbnail.png');

    expect(series.backgroundThumbnail).toMatchObject({ url: `${process.env.ASSETS_URL}/path/to/thumbnail.png` });
  });

  it('should update Provider', async () => {
    expect(series.provider).toBeUndefined();
    const provider = Provider.create({
      extId: 'provider-extid',
      name: 'provider-name',
      configuration: {},
      type: [ProviderContentType.CHANNELS],
      subscription: true,
      format: ProviderNumberFormat.INTEGER,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      mtSlug: 'prod_vod_Reelz',
    }, 'provider-id');

    series.updateProvider(provider);
    expect(series.provider).toBeDefined();
    expect(series.provider?.id).toEqual('provider-id');
    expect(series.provider).toEqual(provider);
  });

  it('should add Platform to Series', async () => {
    expect(series.platforms?.length).toEqual(0);
    const platform = Platform.create({
      extId: 'platform-extid',
      name: 'platform-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'platform-id');
    series.addPlatform(platform);

    expect(series.platforms?.length).toEqual(1);
    if (!series.platforms) return;
    expect(series.platforms[0]).toEqual(platform);
  });

  it('should add Category to Series', async () => {
    expect(series.categories?.length).toEqual(0);
    const category = Category.create({
      extId: 'category-extid',
      name: 'category-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'category-id');
    series.addCategory(category);

    expect(series.categories?.length).toEqual(1);
    if (!series.categories) return;
    expect(series.categories[0]).toEqual(category);
  });

  it('should add Package to Series', async () => {
    expect(series.packages?.length).toEqual(0);
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
    series.addPackage(packageItem);

    expect(series.packages?.length).toEqual(1);
    if (!series.packages) return;
    expect(series.packages[0]).toEqual(packageItem);
  });

  it('should add Genre to Series', async () => {
    expect(series.genres?.length).toEqual(0);
    const genre = Genre.create({
      extId: 'genre-extid',
      name: 'genre-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'genre-id');
    series.addGenre(genre);

    expect(series.genres?.length).toEqual(1);
    if (!series.genres) return;
    expect(series.genres[0]).toEqual(genre);
  });

  it('should add Location to Series', async () => {
    expect(series.locations?.length).toEqual(0);
    const location = Location.create({
      extId: 'location-extid',
      slug: 'location-extid',
      name: 'location-name',
      type: LocationType.PACKAGE,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'location-id');
    series.addLocation(location);

    expect(series.locations?.length).toEqual(1);
    if (!series.locations) return;
    expect(series.locations[0]).toEqual(location);
  });

  it('should add Episode to Series', async () => {
    expect(series.episodes?.length).toEqual(0);
    const episode = Episode.create({
      extId: 'episode-extid',
      name: 'episode-name',
      slug: 'value:1',
      description: 'Value Episodes',
      rating: Rating.TV_14,
      season: '1',
      number: 1,
      duration: '00:59:00',
      contentData: 'data',
      originalAirDate: '2023-11-10T17:10:000Z',
      availableDate: '2022-10-17T00:00:00.000Z',
      expirationDate: '2022-10-17T00:00:00.000Z',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      thumbnail: 'episodes/id/thumbnail.png',
      seriesId: 'seriesId',
      cast: 'cast',
      enabled: true,
      isIngest: false,
    }, 'episode-id');
    episode.updateAlternateThumbnail('episodes/id/alternate-thumbnail.png');
    series.addEpisode(episode);

    expect(series.episodes?.length).toEqual(1);
    if (!series.episodes) return;
    expect(series.episodes[0]).toEqual(episode);
  });

  it('should add Distributor to Series', async () => {
    expect(series.distributors?.length).toEqual(0);
    const distributor = Distributor.create({
      name: 'distributor-name',
      id: 15,
      code: 'code',
      type: {
        name: 'dist',
        slug: 'DST',
        payout_flag: true,
      },
      custom_affiliate_tags: [],
    });
    series.addDistributor(distributor);

    expect(series.distributors?.length).toEqual(1);
    if (!series.distributors) return;
    expect(series.distributors[0]).toEqual(distributor);
  });

  it('should add Brand to Series', async () => {
    expect(series.brands?.length).toEqual(0);
    const brand = Brand.create({
      name: 'brand-name',
      site_id: 15,
      slug: 'brand-slug',
      domain: 'brand-domain',
      active: true,
      logo_image: '',
      logo_image_dark: '',
    });
    series.addBrand(brand);

    expect(series.brands?.length).toEqual(1);
    if (!series.brands) return;
    expect(series.brands[0]).toEqual(brand);
  });
});
