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
import { MrssSeries, MrssThumbnail } from '../../../shared/dto/MrssDto';
import { SeriesDto, SeriesRequestDto } from '../../../shared/dto/vod/SeriesDto';
import { IFactory } from '../../../shared/interfaces/IFactory';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import Episode from '../../episode/shared/Episode';
import { IEpisodeRepository } from '../../episode/shared/IEpisodeRepository';
import { IImageAdaptor } from '../../shared/imageAdaptor/IImageAdaptor';

import Series from './Series';
import { SeriesError } from './SeriesError';

type AssetWithName = Platform | Category | Package | Genre | Location | Distributor | Brand;
type Repository = {
  findMany(ids: Array<string>): Promise<Array<AssetWithName>>
};

export default class SeriesFactory implements IFactory<Series, SeriesRequestDto, SeriesDto> {
  private readonly uid: UID;

  private weightRelations
  : Map<string, Array<WeightRelation>> = new Map<string, Array<WeightRelation>>();

  static ROOT_ENTITY = 'SERIES';

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
    private readonly episodeRepository: IEpisodeRepository,
    private readonly distributorRepository: IDistributorRepository,
    private readonly brandRepository: IBrandRepository,
    private readonly noThumbnailUrl: string,
  ) {
    this.uid = uid;
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
        if (SeriesFactory.WEIGHT_RELATIONS.includes(relation)) {
          this.weightRelations.set(relation, [
            ...(this.weightRelations.get(relation) ?? []),
            { id: relationId },
          ]);
        }
        return relationId;
      }),
    );

    if (relation !== SeriesFactory.BRANDS_KEY && relationItems.length !== relationIds.length) {
      console.log(`relation id=${relation}, relationsIds: ${relationIds.join(', ')}. relationItems: ${JSON.stringify(relationItems, null, 2)}`);
      throw new SeriesError.UnknownSeriesDependency(`relation id=${relation}, relationsIds: ${relationIds.length}. relationItems: ${relationItems.length}`);
    }
    return relationItems.sort(SeriesFactory.sortByName);
  }

  private async updateRelationsWeight(series: Series) {
    const categoriesRelations = await this.categoryRepository
      .getParentRelationships(SeriesFactory.ROOT_ENTITY, series.id);

    await series.setCategoriesWeight(
      await categoriesRelations.map((relation) => ({
        id: relation.id,
        weight: relation.weight,
      })),
    );
    await series.updateRelationsWeight();
  }

  static haveUnknownBrands(brands: Array<Brand>, expectedIds: Array<string>): boolean {
    const knownBrands: Array<string> = [...new Set(brands.map((brand) => `${brand.siteId}`))];
    return knownBrands.length < expectedIds.length;
  }

  async ingestToDomain(
    item: MrssSeries,
    imageAdaptor: IImageAdaptor,
    // matchedGuidIds: { [guid: string]: string },
    provider?: string,
    packages?: Array<string>,
    brands?: Array<string>,
    distributors?: Array<string>,
    locations?: Array<string>,
    platforms?: Array<string>,
  ): Promise<Series> {
    const thumbnails = {
      seriesMainThumbnail: item.seriesMainThumbnail,
      seriesAltThumbnail: item.seriesAltThumbnail,
      seriesBackgroundThumbnail: item.seriesBackgroundThumbnail,
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
    const { results: genres } = await PromisePool
      .for(item.genres)
      .process(async (genre) => {
        const [foundGenre] = await this.genreRepository.findBy('searchExtId', genre.toLowerCase());

        return foundGenre;
      });

    const seriesMainThumbnail = results.find((thumbnail) => thumbnail.type === 'seriesMainThumbnail');
    const seriesAltThumbnail = results.find((thumbnail) => thumbnail.type === 'seriesAltThumbnail');
    const seriesBackgroundThumbnail = results.find((thumbnail) => thumbnail.type === 'seriesBackgroundThumbnail');

    const series = Series.create({
      name: item.title,
      extId: item.extId ?? item.guid,
      slug: item.guid,
      availableDate: item.pubDate,
      description: item.description,
      imdbId: '',
      tmdbId: '',
      vastId: '',
      releaseYear: item.pubDate,
      expirationDate: toISOString(item.avail.end),
      rating: item.rating as MovieRating ?? MovieRating.NOT_RATED,
      contentData: JSON.stringify(item),
      thumbnail: seriesMainThumbnail?.value ?? this.noThumbnailUrl,
      backgroundThumbnail: seriesBackgroundThumbnail?.value ?? this.noThumbnailUrl,
      cast: item.cast?.join(', ') ?? '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: new Date(item.avail.end) > new Date() ? true : false,
      isIngest: true,
      exclude: 'provider,platforms,packages,categories,distributors,brands,genres,locations',
    }, item.guid ?? this.uid.generate(8));

    await series.updateAlternateThumbnail(
      seriesAltThumbnail?.value ?? this.noThumbnailUrl,
    );
    series.genres = await genres.filter((genre) => genre);
    if (provider && provider !== '') {
      const providerItem = await this.providerRepository.findOne(provider);
      series.provider = providerItem;
    }
    if (packages && packages.length) {
      const packageItems = await this.packageRepository.findMany(packages);
      series.packages = packageItems;
    }
    if (brands && brands.length) {
      const brandItems = await this.brandRepository.findMany(brands);
      series.brands = brandItems;
    }
    if (distributors && distributors.length) {
      const distributorItems = await this.distributorRepository.findMany(distributors);
      series.distributors = distributorItems;
    }
    if (locations && locations.length) {
      const locationItems = await this.locationRepository.findMany(locations);
      series.locations = locationItems;
    }
    if (platforms && platforms.length) {
      const platformItems = await this.platformRepository.findMany(platforms);
      series.platforms = platformItems;
    }
    console.log('series created');
    return series;
  }

  async toDomain(raw: SeriesDto): Promise<Series> {
    const seriesId = raw.id || this.uid.generate(8);
    const series = Series.create({
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
      cast: '',
      enabled: raw.enabled ?? true,
      isIngest: raw.isIngest ?? false,
      ...raw,
    }, seriesId);

    if (raw.alternateThumbnail) {
      series.updateAlternateThumbnail(raw.alternateThumbnail);
    }
    const excludedAttr = raw.exclude?.split(',') ?? [];
    console.log('seriesId', seriesId);

    if (!Series.isRelationExcluded('platforms', excludedAttr)) series.platforms = await this.handleRelations('platforms', raw.platforms, this.platformRepository) as Array<Platform>;
    if (!Series.isRelationExcluded('categories', excludedAttr)) series.categories = await this.handleRelations('categories', raw.categories, this.categoryRepository) as Array<Category>;
    series.setCategoriesWeight(this.weightRelations.get('categories') ?? []);
    if (!Series.isRelationExcluded('packages', excludedAttr)) series.packages = await this.handleRelations('packages', raw.packages, this.packageRepository) as Array<Package>;
    if (!Series.isRelationExcluded('genres', excludedAttr)) series.genres = await this.handleRelations('genres', raw.genres, this.genreRepository) as Array<Genre>;
    if (!Series.isRelationExcluded('locations', excludedAttr)) series.locations = await this.handleRelations('locations', raw.locations, this.locationRepository) as Array<Location>;
    if (!Series.isRelationExcluded('episodes', excludedAttr) /* && !series.isIngest */) series.episodes = await this.handleRelations('episodes', raw.episodes, this.episodeRepository) as Array<Episode>;
    if (!Series.isRelationExcluded('distributors', excludedAttr)) series.distributors = await this.handleRelations('distributors', raw.distributors?.map((id) => id.toString()), this.distributorRepository) as Array<Distributor>;
    if (!Series.isRelationExcluded('brands', excludedAttr)) series.brands = await this.handleRelations('brands', raw.brands?.map((id) => id.toString()), this.brandRepository) as Array<Brand>;

    if (!Series.isRelationExcluded('provider', excludedAttr)) {
      series.provider = await this.providerRepository.findOne(raw.provider);
      // if (series.provider === undefined) throw new SeriesError
      // .UnknownSeriesDependency(`on series id=${seriesId}: provider id=${raw.provider}`);
    }

    if (series.isIngest) {
      // series.episodes = await this
      // .handleRelations('episodes', raw.episodes, this.episodeRepository) as Array<Episode>;
      // series.genres = await this
      // .handleRelations('genres', raw.genres, this.genreRepository) as Array<Genre>;
      return series;
    }

    // TODO: enable back the following two lines in the future
    // eslint-disable-next-line max-len
    // if (!Series.isRelationExcluded('packages', excludedAttr) && !series.packages?.length) throw new SeriesError.UnknownSeriesDependency(`on series id=${seriesId}: packages`);
    // eslint-disable-next-line max-len
    // if (!Series.isRelationExcluded('brands', excludedAttr) && (!series.brands?.length || SeriesFactory.haveUnknownBrands(series.brands ?? [], raw.brands?.map((id) => id.toString())))) throw new SeriesError.UnknownSeriesDependency(`on series id=${seriesId}: brands`);

    await this.updateRelationsWeight(series);
    delete series.categoriesWeight;
    this.weightRelations.clear();
    return series;
  }

  toPersistence(raw: Series): SeriesDto {
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
      episodes: Array.from(raw.episodes ?? []).map((episode) => episode.id),
      distributors: Array.from(raw.distributors ?? []).map((distributor) => `${distributor.id}`),
      brands: [...new Set(Array.from(raw.brands ?? []).map((brand) => `${brand.siteId}`))],
    };
  }
}
