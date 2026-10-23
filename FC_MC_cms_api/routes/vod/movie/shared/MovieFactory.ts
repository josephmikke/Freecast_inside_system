import { PromisePool } from '@supercharge/promise-pool';

import { toISOString } from '../../../../utils/toISOString';
import Genre from '../../../asset/shared/Genre';
import { MovieRating } from '../../../asset/shared/Rating';
import Brand from '../../../brand/shared/Brand';
import { IBrandRepository } from '../../../brand/shared/IBrandRepository';
import Category from '../../../category/shared/Category';
import { ICategoryRepository } from '../../../category/shared/ICategoryRepository';
import Distributor from '../../../distributor/shared/Distributor';
import { IDistributorRepository } from '../../../distributor/shared/IDistributorRepository';
import { IGenreRepository } from '../../../genre/shared/IGenreRepository';
import { ILocationRepository } from '../../../location/shared/ILocationRepository';
import Location from '../../../location/shared/Location';
import { IPackageRepository } from '../../../package/shared/IPackageRepository';
import Package from '../../../package/shared/Package';
import { IPlatformRepository } from '../../../platform/shared/IPlatformRepository';
import Platform from '../../../platform/shared/Platform';
import { IProviderRepository } from '../../../provider/shared/IProviderRepository';
import { WeightRelation } from '../../../shared/dto/ChannelDto';
import { MrssMovie, MrssThumbnail } from '../../../shared/dto/MrssDto';
import { StreamProps } from '../../../shared/dto/StreamDto';
import { MovieDto, MovieRequestDto } from '../../../shared/dto/vod/MovieDto';
import { IFactory } from '../../../shared/interfaces/IFactory';
import { IStreamRepository } from '../../../stream/shared/IStreamRepository';
import Stream from '../../../stream/shared/Stream';
import StreamFactory from '../../../stream/shared/StreamFactory';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import { IImageAdaptor } from '../../shared/imageAdaptor/IImageAdaptor';

import Movie from './Movie';
import { MovieError } from './MovieError';

type AssetWithName = Platform | Category | Package | Genre | Location | Distributor | Brand;
type Repository = {
  findMany(ids: Array<string>): Promise<Array<AssetWithName>>
};

export default class MovieFactory implements IFactory<Movie, MovieRequestDto, MovieDto> {
  private readonly uid: UID;

  private readonly streamFactory: StreamFactory;

  private createdStream: Array<Stream> = [];

  private weightRelations:
  Map<string, Array<WeightRelation>> = new Map<string, Array<WeightRelation>>();

  static ROOT_ENTITY = 'MOVIE';

  static WEIGHT_RELATIONS = ['categories'];

  static BRANDS_KEY = 'brands';

  static readonly sortByName = (a: AssetWithName, b: AssetWithName) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  };

  constructor(
    uid: UID,
    private readonly providerRepository: IProviderRepository,
    private readonly platformRepository: IPlatformRepository,
    private readonly categoryRepository: ICategoryRepository,
    private readonly packageRepository: IPackageRepository,
    private readonly genreRepository: IGenreRepository,
    private readonly locationRepository: ILocationRepository,
    private readonly streamRepository: IStreamRepository,
    private readonly distributorRepository: IDistributorRepository,
    private readonly brandRepository: IBrandRepository,
    private readonly noThumbnailUrl: string,
  ) {
    this.uid = uid;
    this.streamFactory = new StreamFactory(uid);
  }

  public async removeStreams() {
    await Promise.all(this.createdStream.map(async (stream) => {
      if (!(await this.streamRepository.hasRelationships(stream))) {
        await this.streamRepository.remove(stream);
      }
    }));
  }

  private async handleRelations(
    relation: string,
    relationIds: Array<string | WeightRelation> | undefined,
    relationRepository: Repository,
  ) {
    if (!relationIds?.length) {
      return [];
    }

    const relationItems = await relationRepository.findMany(
      relationIds.map((relationId: string | WeightRelation) => {
        if (typeof relationId !== 'string') {
          this.weightRelations.set(relation, [
            ...(this.weightRelations.get(relation) ?? []),
            relationId,
          ]);
          return relationId.id;
        }
        if (MovieFactory.WEIGHT_RELATIONS.includes(relation)) {
          this.weightRelations.set(relation, [
            ...(this.weightRelations.get(relation) ?? []),
            { id: relationId },
          ]);
        }
        return relationId;
      }),
    );

    if (relation !== MovieFactory.BRANDS_KEY && relationItems.length !== relationIds.length) {
      throw new MovieError.UnknownMovieDependency(relation);
    }
    return relationItems.sort(MovieFactory.sortByName);
  }

  public async addStream(streamProps: Array<StreamProps>): Promise<Array<Stream>> {
    return Promise.all(
      streamProps
        .map(async (stream: StreamProps) => {
          const streamItem = await this.streamFactory.toDomain({
            ...stream,
          });

          if (
            !(await this.streamRepository.exists(streamItem))
            && (await this.streamRepository.findOne(streamItem.id)) === undefined
          ) {
            this.createdStream.push(streamItem);
            await this.streamRepository.save(streamItem);
          } else {
            throw new MovieError.MovieStreamCreation('Stream exitId or id already taken');
          }
          return streamItem;
        }) ?? [],
    );
  }

  public async handleStreams(relationItems: Array<string | StreamProps>) {
    if (!relationItems?.length) {
      return [];
    }

    const existingStreams = (relationItems.filter((stream: string | StreamProps) => typeof stream === 'string') as Array<string>);
    const newStreams = await Promise.all(
      (relationItems.filter((stream: string | StreamProps) => typeof stream !== 'string') as Array<StreamProps>)
        .map(async (stream: StreamProps) => {
          const streamItem = await this.streamFactory.toDomain({
            ...stream,
          });

          if (
            !(await this.streamRepository.exists(streamItem))
            && (await this.streamRepository.findOne(streamItem.id)) === undefined
          ) {
            this.createdStream.push(streamItem);
            await this.streamRepository.save(streamItem);
          } else {
            throw new MovieError.MovieStreamCreation('Stream exitId or id already taken');
          }
          return streamItem;
        }) ?? [],
    );

    const streams = await [
      ...(existingStreams.length ? await this.streamRepository.findMany(existingStreams) : []),
      ...newStreams,
    ];

    if (relationItems.length !== streams.length) {
      throw new MovieError.UnknownMovieDependency('streams');
    }
    return streams.sort(MovieFactory.sortByName);
  }

  private async updateRelationsWeight(movie: Movie) {
    const categoriesRelations = await this.categoryRepository
      .getParentRelationships(MovieFactory.ROOT_ENTITY, movie.id);

    await movie.setCategoriesWeight(
      await categoriesRelations.map((relation) => ({
        id: relation.id,
        weight: relation.weight,
      })),
    );
    await movie.updateRelationsWeight();
  }

  static haveUnknownBrands(brands: Array<Brand>, expectedIds: Array<string>): boolean {
    const knownBrands: Array<string> = [...new Set(brands.map((brand) => `${brand.siteId}`))];
    return knownBrands.length < expectedIds.length;
  }

  async ingestToDomain(
    item: MrssMovie,
    imageAdaptor: IImageAdaptor,
    // matchedGuidIds: { [guid: string]: string },
    provider?: string,
    packages?: Array<string>,
    brands?: Array<string>,
    distributors?: Array<string>,
    locations?: Array<string>,
    platforms?: Array<string>,
  ): Promise<Movie> {
    console.log('movie ingestToDomain');
    const thumbnails = {
      movieMainThumbnail: item.movieMainThumbnail,
      movieAltThumbnail: item.movieAltThumbnail,
      movieBackgroundThumbnail: item.movieBackgroundThumbnail,
    };
    const { results } = await PromisePool
      .for(Object.entries(thumbnails))
      .process(async ([key, value]) => {
        if (Object.keys(value).length === 0) {
          return {
            type: key,
            value: undefined,
          };
        }
        await imageAdaptor.ingest((value as MrssThumbnail).url);
        return {
          type: key,
          value: imageAdaptor.value(),
        };
      });
    console.log('movie after thumnails');
    const movieMainThumbnail = results.find((thumbnail) => thumbnail.type === 'movieMainThumbnail');
    const movieAltThumbnail = results.find((thumbnail) => thumbnail.type === 'movieAltThumbnail');
    const movieBackgroundThumbnail = results.find((thumbnail) => thumbnail.type === 'movieBackgroundThumbnail');

    const genres: Array<Genre> = await Promise.all(item.genres.map(async (genre) => {
      const [foundGenre] = await this.genreRepository.findBy('searchExtId', genre.toLowerCase());

      return foundGenre;
    }));

    const movie = Movie.create({
      name: item.title,
      extId: item.extId ?? item.guid,
      slug: item.guid,
      availableDate: toISOString(item.avail.start),
      description: item.description,
      imdbId: '',
      tmdbId: '',
      vastId: '',
      releaseYear: item.pubDate,
      expirationDate: toISOString(item.avail.end),
      rating: item.rating as MovieRating ?? MovieRating.NOT_RATED,
      contentData: JSON.stringify(item),
      thumbnail: movieMainThumbnail?.value ?? this.noThumbnailUrl,
      backgroundThumbnail: movieBackgroundThumbnail?.value ?? this.noThumbnailUrl,
      cast: item.cast?.join(', ') ?? '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: new Date(item.avail.end) > new Date() ? true : false,
      isIngest: true,
      exclude: 'provider,platforms,packages,categories,distributors,brands,genres,locations',
    }, item.guid ?? this.uid.generate(8));

    await movie.updateAlternateThumbnail(
      movieAltThumbnail?.value ?? this.noThumbnailUrl,
    );
    movie.genres = genres.filter((genre) => genre);
    if (provider && provider !== '') {
      const providerItem = await this.providerRepository.findOne(provider);
      movie.provider = providerItem;
    }
    if (packages && packages.length) {
      const packageItems = await this.packageRepository.findMany(packages);
      movie.packages = packageItems;
    }
    if (brands && brands.length) {
      const brandItems = await this.brandRepository.findMany(brands);
      movie.brands = brandItems;
    }
    if (distributors && distributors.length) {
      const distributorItems = await this.distributorRepository.findMany(distributors);
      movie.distributors = distributorItems;
    }
    if (locations && locations.length) {
      const locationItems = await this.locationRepository.findMany(locations);
      movie.locations = locationItems;
    }
    if (platforms && platforms.length) {
      const platformItems = await this.platformRepository.findMany(platforms);
      movie.platforms = platformItems;
    }
    return movie;
  }

  async toDomain(raw: MovieDto): Promise<Movie> {
    const movieId = raw.id || this.uid.generate(8);
    const movie = Movie.create({
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      createdAt: raw.createdAt ?? new Date().toISOString(),
      extId: raw.extId ?? '',
      imdbId: raw.imdbId ?? '',
      tmdbId: raw.tmdbId ?? '',
      vastId: raw.vastId ?? '',
      releaseYear: raw.releaseYear ?? '',
      expirationDate: raw.expirationDate ?? '',
      contentData: raw.contentData ?? '',
      exclude: raw.exclude ?? '',
      cast: raw.cast ?? '',
      enabled: raw.enabled ?? true,
      isIngest: raw.isIngest ?? false,
      ...raw,
    }, movieId);

    if (raw.alternateThumbnail) {
      movie.updateAlternateThumbnail(raw.alternateThumbnail);
    }
    this.createdStream = [];
    const excludedAttr = raw.exclude?.split(',') ?? [];

    try {
      if (!Movie.isRelationExcluded('streams', excludedAttr)) movie.streams = await this.handleStreams(raw.streams ?? []);
    } catch (e) {
      await this.removeStreams();
      throw e;
    }

    /* if (movie.isIngest) {
      movie.genres = await this.handleRelations('genres', raw.genres, this.genreRepository) as Array<Genre>;
      movie.provider = await this.providerRepository.findOne(raw.provider);
      movie.packages = await this.handleRelations('packages', raw.packages, this.packageRepository) as Array<Package>;
      return movie;
    } */

    if (!Movie.isRelationExcluded('provider', excludedAttr)) {
      movie.provider = await this.providerRepository.findOne(raw.provider);
      // if (movie.provider === undefined) throw new MovieError.UnknownMovieDependency(`on movie id=${movieId}: provider id=${raw.provider}`);
    }

    if (!Movie.isRelationExcluded('platforms', excludedAttr)) movie.platforms = await this.handleRelations('platforms', raw.platforms, this.platformRepository) as Array<Platform>;
    if (!Movie.isRelationExcluded('categories', excludedAttr)) movie.categories = await this.handleRelations('categories', raw.categories, this.categoryRepository) as Array<Category>;
    movie.setCategoriesWeight(this.weightRelations.get('categories') ?? []);
    if (!Movie.isRelationExcluded('packages', excludedAttr)) movie.packages = await this.handleRelations('packages', raw.packages, this.packageRepository) as Array<Package>;
    if (!Movie.isRelationExcluded('genres', excludedAttr)) movie.genres = await this.handleRelations('genres', raw.genres, this.genreRepository) as Array<Genre>;
    if (!Movie.isRelationExcluded('locations', excludedAttr)) movie.locations = await this.handleRelations('locations', raw.locations, this.locationRepository) as Array<Location>;
    if (!Movie.isRelationExcluded('distributors', excludedAttr)) movie.distributors = await this.handleRelations('distributors', raw.distributors?.map((id) => id.toString()), this.distributorRepository) as Array<Distributor>;
    if (!Movie.isRelationExcluded('brands', excludedAttr)) movie.brands = await this.handleRelations('brands', raw.brands?.map((id) => id.toString()), this.brandRepository) as Array<Brand>;

    // if (!Movie.isRelationExcluded('packages', excludedAttr) && !movie.packages?.length) throw new MovieError.UnknownMovieDependency(`on movie id=${movieId}: packages`);
    // if (!Movie.isRelationExcluded('brands', excludedAttr) && (!movie.brands?.length || MovieFactory.haveUnknownBrands(movie.brands ?? [], raw.brands?.map((id) => id.toString())))) throw new MovieError.UnknownMovieDependency(`on movie id=${movieId}: brands`);

    // if (!Movie.isRelationExcluded('streams', excludedAttr) && !movie.streams?.length) throw new MovieError.UnknownMovieDependency(`on movie id=${movieId}: streams`);

    await this.updateRelationsWeight(movie);
    delete movie.categoriesWeight;
    this.weightRelations.clear();
    return movie;
  }

  toPersistence(raw: Movie): MovieDto {
    return {
      ...raw,
      thumbnail: raw.thumbnail.value(),
      alternateThumbnail: raw.alternateThumbnail?.value(),
      backgroundThumbnail: raw.backgroundThumbnail?.value(),
      provider: raw.provider?.id ?? '',
      platforms: Array.from(raw.platforms ?? []).map((platform) => platform.id),
      categories: Array.from(raw.categories ?? []).map((category) => category.id),
      packages: Array.from(raw.packages ?? []).map((packageItem) => packageItem.id),
      genres: Array.from(raw.genres ?? []).map((genre) => genre.id),
      locations: Array.from(raw.locations ?? []).map((location) => location.id),
      streams: Array.from(raw.streams ?? []).map((stream) => stream.id),
      distributors: Array.from(raw.distributors ?? []).map((distributor) => `${distributor.id}`),
      brands: [...new Set(Array.from(raw.brands ?? []).map((brand) => `${brand.siteId}`))],
      mediapackageIds: Array.from(raw.mediapackageIds ?? []),
    };
  }
}
