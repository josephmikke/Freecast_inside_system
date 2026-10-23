import Genre from '../../../asset/shared/Genre';
import { MovieRating } from '../../../asset/shared/Rating';
import Brand from '../../../brand/shared/Brand';
import Category from '../../../category/shared/Category';
import Distributor from '../../../distributor/shared/Distributor';
import Location from '../../../location/shared/Location';
import Package from '../../../package/shared/Package';
import Platform from '../../../platform/shared/Platform';
import Provider from '../../../provider/shared/Provider';
import { WeightRelation } from '../../../shared/dto/ChannelDto';
import { MovieDto } from '../../../shared/dto/vod/MovieDto';
import { VodType, IVod } from '../../../shared/dto/vod/VodDto';
import Asset from '../../../shared/interfaces/Asset';
import { ValueObject } from '../../../shared/interfaces/ValueObject';
import Thumbnail from '../../../shared/valueObjects/Thumbnail';
import Stream from '../../../stream/shared/Stream';

type OmittedMovieProps = Omit<MovieDto, 'id' | 'provider' | 'platforms' | 'categories' | 'alternateThumbnail' | 'packages' | 'genres' | 'locations' | 'distributors' | 'brands' | 'streams'>;

// `mediapackageIds` is optional on the DTO and defaulted by the entity, so it is
// excluded from the Required<> wrapper that makes every other field mandatory.
type MovieCreateProps = Required<Omit<OmittedMovieProps, 'mediapackageIds'>>
  & Pick<OmittedMovieProps, 'mediapackageIds'>;

interface IIndexable {
  [key: string]: any;
}

export default class Movie extends Asset implements IVod {
  static POSSIBLE_EXCLUDE_RELATIONS = ['provider', 'platforms', 'categories', 'packages', 'genres', 'locations', 'streams', 'distributors', 'brands'];

  public readonly type: VodType = VodType.MOVIE;

  public readonly extId: string;

  public readonly name: string;

  public readonly slug: string;

  public readonly imdbId: string;

  public readonly tmdbId: string;

  public readonly vastId: string;

  public readonly rating: MovieRating;

  public readonly description: string;

  public readonly releaseYear: string;

  public readonly availableDate: string;

  public readonly expirationDate: string;

  public readonly contentData: string;

  public readonly cast: string;

  public readonly isIngest: boolean;

  public thumbnail: ValueObject<Thumbnail>;

  public alternateThumbnail?: ValueObject<Thumbnail>;

  public backgroundThumbnail: ValueObject<Thumbnail>;

  public provider: Provider | undefined;

  public platforms?: Array<Platform>;

  public categories?: Array<Category>;

  public categoriesWeight?: Map<string, number>;

  public packages?: Array<Package>;

  public genres?: Array<Genre>;

  public locations?: Array<Location>;

  public streams?: Array<Stream>;

  public distributors?: Array<Distributor>;

  public brands?: Array<Brand>;

  public mediapackageIds: Array<string>;

  private constructor(props: MovieCreateProps, id: string) {
    super(props, id);
    this.extId = props.extId;
    this.name = props.name;
    this.slug = props.slug;
    this.vastId = props.vastId;
    this.rating = props.rating;
    this.imdbId = props.imdbId;
    this.tmdbId = props.tmdbId;
    this.description = props.description;
    this.availableDate = props.availableDate;
    this.expirationDate = props.expirationDate;
    this.releaseYear = props.releaseYear;
    this.contentData = props.contentData;
    this.cast = props.cast;
    this.thumbnail = new Thumbnail(props.thumbnail);
    this.backgroundThumbnail = new Thumbnail(props.backgroundThumbnail);
    this.isIngest = props.isIngest;
    this.mediapackageIds = props.mediapackageIds ?? [];

    this.platforms = [];
    this.categories = [];
    this.categoriesWeight = new Map<string, number>();
    this.packages = [];
    this.genres = [];
    this.locations = [];
    this.streams = [];
    this.distributors = [];
    this.brands = [];
    this.excludeRelations(props.exclude);
  }

  excludeRelations(exclude?: string): void {
    const excludedAttr: Array<string> = (exclude?.split(',') ?? [])
      .filter((excludeAttr) => Movie.POSSIBLE_EXCLUDE_RELATIONS.includes(excludeAttr));

    excludedAttr.forEach((attr: string) => {
      (this as Movie as IIndexable)[attr as keyof Movie] = undefined;
    });
  }

  static isRelationExcluded(relationKey: string, excludedAttr: Array<string>): boolean {
    return excludedAttr.includes(relationKey);
  }

  updateProvider(provider: Provider) {
    this.provider = provider;
  }

  addPlatform(platform: Platform) {
    this.platforms?.push(platform);
  }

  addCategory(category: Category) {
    this.categories?.push(category);
  }

  addPackage(packageItem: Package) {
    this.packages?.push(packageItem);
  }

  addGenre(genre: Genre) {
    this.genres?.push(genre);
  }

  addLocation(location: Location) {
    this.locations?.push(location);
  }

  addStream(stream: Stream) {
    this.streams?.push(stream);
  }

  addDistributor(distributor: Distributor) {
    this.distributors?.push(distributor);
  }

  addBrand(brand: Brand) {
    this.brands?.push(brand);
  }

  addMediapackageId(mediapackageId: string) {
    if (!this.mediapackageIds.includes(mediapackageId)) {
      this.mediapackageIds.push(mediapackageId);
    }
    return this;
  }

  updateThumbnail(path: string) {
    this.thumbnail = new Thumbnail(path);
    return this;
  }

  updateAlternateThumbnail(path: string) {
    this.alternateThumbnail = new Thumbnail(path);
    return this;
  }

  updateBackgroundThumbnail(path: string) {
    this.backgroundThumbnail = new Thumbnail(path);
    return this;
  }

  setCategoriesWeight(weightRelations: Array<WeightRelation>) {
    weightRelations.forEach((weightRelation) => {
      this.categoriesWeight?.set(weightRelation.id, weightRelation.weight ?? 0);
    });
  }

  updateRelationsWeight() {
    this.categories = this.categories?.map((category) => (
      Category.create({
        ...category,
        weight: this.categoriesWeight?.get(category.id) ?? 0,
      }, category.id)
    ));
  }

  updateEnabled(enabled: boolean) {
    this.enabled = enabled;
    return this;
  }

  shouldDeactivate(): boolean {
    return (this.expirationDate !== null && new Date(this.expirationDate) < new Date())
      || !this.thumbnail
      || this.thumbnail.value() === process.env.NO_THUMBNAIL_URL!
      || this.streams?.length === 0;
  }

  static create(props: MovieCreateProps, id: string): Movie {
    return new Movie(props, id);
  }
}
