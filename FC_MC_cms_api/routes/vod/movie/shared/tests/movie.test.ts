import { MovieRating } from '../../../../asset/shared/Rating';
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
import { StreamFormat, StreamType } from '../../../../shared/dto/StreamDto';
import { MovieRequestDto } from '../../../../shared/dto/vod/MovieDto';
import Stream from '../../../../stream/shared/Stream';
import Movie from '../Movie';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const movieDto: MovieRequestDto = {
  extId: 'movie-extId',
  description: 'Test movie',
  name: 'Reelz_SD',
  rating: MovieRating.PG_13,
  availableDate: '2022-11-10T17:10:000Z',
  expirationDate: '2023-11-10T17:10:000Z',
  slug: 'reelz-sd',
  vastId: '',
  imdbId: '',
  tmdbId: '',
  contentData: '',
  thumbnail: 'movies/mymovieid/thumbnail.png',
  alternateThumbnail: 'movies/mymovieid/thumbnail.png',
  backgroundThumbnail: 'movies/mymovieid/thumbnail.png',
  provider: '',
  packages: [],
  categories: [],
  brands: [],
  streams: [],
  platforms: [],
};
let movie: Movie;

describe('Movie creation', () => {
  it('should create a Movie instance', async () => {
    movie = Movie.create({
      ...movieDto,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      extId: movieDto.extId ?? '',
      imdbId: '',
      tmdbId: '',
      contentData: '',
      releaseYear: '',
      expirationDate: movieDto.expirationDate ?? '',
      vastId: movieDto.vastId ?? '',
      exclude: '',
      cast: '',
      enabled: true,
      isIngest: false,
    }, 'main-movie-id');
    movie.updateAlternateThumbnail('movies/mymovieid/thumbnail.png');

    expect(movie).toBeDefined();
  });
});

describe('Movie methods', () => {
  it('should update Movie thumbnail', async () => {
    expect(movie.thumbnail.value()).toEqual('movies/mymovieid/thumbnail.png');

    movie.updateThumbnail('path/to/thumbnail.png');

    expect(movie.thumbnail.value()).toEqual('path/to/thumbnail.png');
  });

  it('should update Movie alternate thumbnail', async () => {
    expect(movie.alternateThumbnail?.value()).toEqual('movies/mymovieid/thumbnail.png');

    movie.updateAlternateThumbnail('path/to/thumbnail.png');

    expect(movie.alternateThumbnail?.value()).toEqual('path/to/thumbnail.png');
  });

  it('should update Movie background thumbnail', async () => {
    expect(movie.backgroundThumbnail?.value()).toEqual('movies/mymovieid/thumbnail.png');

    movie.updateBackgroundThumbnail('path/to/thumbnail.png');

    expect(movie.backgroundThumbnail?.value()).toEqual('path/to/thumbnail.png');
  });

  it('should update Provider', async () => {
    expect(movie.provider).toBeUndefined();
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

    movie.updateProvider(provider);
    expect(movie.provider).toBeDefined();
    expect(movie.provider?.id).toEqual('provider-id');
    expect(movie.provider).toEqual(provider);
  });

  it('should add Platform to Movie', async () => {
    expect(movie.platforms?.length).toEqual(0);
    const platform = Platform.create({
      extId: 'platform-extid',
      name: 'platform-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'platform-id');
    movie.addPlatform(platform);

    expect(movie.platforms?.length).toEqual(1);
    if (!movie.platforms) return;
    expect(movie.platforms[0]).toEqual(platform);
  });

  it('should add Category to Movie', async () => {
    expect(movie.categories?.length).toEqual(0);
    const category = Category.create({
      extId: 'category-extid',
      name: 'category-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'category-id');
    movie.addCategory(category);

    expect(movie.categories?.length).toEqual(1);
    if (!movie.categories) return;
    expect(movie.categories[0]).toEqual(category);
  });

  it('should add Package to Movie', async () => {
    expect(movie.packages?.length).toEqual(0);
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
    movie.addPackage(packageItem);

    expect(movie.packages?.length).toEqual(1);
    if (!movie.packages) return;
    expect(movie.packages[0]).toEqual(packageItem);
  });

  it('should add Genre to Movie', async () => {
    expect(movie.genres?.length).toEqual(0);
    const genre = Genre.create({
      extId: 'genre-extid',
      name: 'genre-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'genre-id');
    movie.addGenre(genre);

    expect(movie.genres?.length).toEqual(1);
    if (!movie.genres) return;
    expect(movie.genres[0]).toEqual(genre);
  });

  it('should add Location to Movie', async () => {
    expect(movie.locations?.length).toEqual(0);
    const location = Location.create({
      extId: 'location-extid',
      slug: 'location-extid',
      name: 'location-name',
      type: LocationType.PACKAGE,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'location-id');
    movie.addLocation(location);

    expect(movie.locations?.length).toEqual(1);
    if (!movie.locations) return;
    expect(movie.locations[0]).toEqual(location);
  });

  it('should add Stream to Movie', async () => {
    expect(movie.streams?.length).toEqual(0);
    const stream = Stream.create({
      extId: 'stream-extid',
      name: 'stream-name',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: 'data',
      daiParams: true,
      weight: 1,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'stream-id');
    movie.addStream(stream);

    expect(movie.streams?.length).toEqual(1);
    if (!movie.streams) return;
    expect(movie.streams[0]).toEqual(stream);
  });

  it('should add Distributor to Movie', async () => {
    expect(movie.distributors?.length).toEqual(0);
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
    movie.addDistributor(distributor);

    expect(movie.distributors?.length).toEqual(1);
    if (!movie.distributors) return;
    expect(movie.distributors[0]).toEqual(distributor);
  });

  it('should add Brand to Movie', async () => {
    expect(movie.brands?.length).toEqual(0);
    const brand = Brand.create({
      name: 'brand-name',
      site_id: 15,
      slug: 'brand-slug',
      domain: 'brand-domain',
      active: true,
      logo_image: '',
      logo_image_dark: '',
    });
    movie.addBrand(brand);

    expect(movie.brands?.length).toEqual(1);
    if (!movie.brands) return;
    expect(movie.brands[0]).toEqual(brand);
  });
});
