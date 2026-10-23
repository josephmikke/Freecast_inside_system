import Genre from '../../asset/shared/Genre';
import { Rating } from '../../asset/shared/Rating';
import Brand from '../../brand/shared/Brand';
import Category from '../../category/shared/Category';
import Distributor from '../../distributor/shared/Distributor';
import EPG from '../../epg/shared/EPG';
import Location from '../../location/shared/Location';
import Package from '../../package/shared/Package';
import Platform from '../../platform/shared/Platform';
import Provider from '../../provider/shared/Provider';
import { ChannelDto, WeightRelation } from '../../shared/dto/ChannelDto';
import Asset from '../../shared/interfaces/Asset';
import { ValueObject } from '../../shared/interfaces/ValueObject';
import MediaPackageId from '../../shared/valueObjects/MediaPackageId';
import Thumbnail from '../../shared/valueObjects/Thumbnail';
import Stream from '../../stream/shared/Stream';

type OmittedChannelProps = Omit<ChannelDto, 'id' | 'provider' | 'platforms' | 'categories' | 'packages' | 'genres' | 'locations' | 'distributors' | 'brands' | 'streams' | 'mediapackageId'> & { mediapackageId: ValueObject<MediaPackageId> };
interface IIndexable {
  [key: string]: any;
}

export const ROOT_ENTITY = 'CHANNEL';

export default class Channel extends Asset {
  static POSSIBLE_EXCLUDE_RELATIONS = ['epg', 'provider', 'platforms', 'categories', 'packages', 'genres', 'locations', 'streams', 'distributors', 'brands'];

  public readonly extId: string;

  public readonly name: string;

  public readonly slug: string;

  public readonly lcn: number;

  public readonly vastId: string;

  public readonly rating: Rating;

  public readonly description: string;

  public readonly visible: boolean;

  public readonly catchUpActive: boolean;

  public readonly availableDate: string;

  public readonly expirationDate: string;

  public readonly mediapackageId: ValueObject<MediaPackageId>;

  public thumbnail: ValueObject<Thumbnail>;

  public provider: Provider | undefined;

  public epg: EPG | undefined;

  public platforms?: Array<Platform>;

  public categories?: Array<Category>;

  public categoriesWeight?: Map<string, number>;

  public packages?: Array<Package>;

  public genres?: Array<Genre>;

  public locations?: Array<Location>;

  public streams?: Array<Stream>;

  public distributors?: Array<Distributor>;

  public brands?: Array<Brand>;

  private constructor(props: Required<OmittedChannelProps>, id: string) {
    super(props, id);
    this.extId = props.extId;
    this.name = props.name;
    this.slug = props.slug;
    this.lcn = props.lcn;
    this.vastId = props.vastId;
    this.rating = props.rating;
    this.description = props.description;
    this.visible = props.visible;
    this.catchUpActive = props.catchUpActive;
    this.availableDate = props.availableDate;
    this.expirationDate = props.expirationDate;
    this.mediapackageId = props.mediapackageId;
    this.thumbnail = new Thumbnail(props.thumbnail);

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
      .filter((excludeAttr) => Channel.POSSIBLE_EXCLUDE_RELATIONS.includes(excludeAttr));

    excludedAttr.forEach((attr: string) => {
      (this as Channel as IIndexable)[attr as keyof Channel] = undefined;
    });
  }

  static isRelationExcluded(relationKey: string, excludedAttr: Array<string>): boolean {
    return excludedAttr.includes(relationKey);
  }

  updateProvider(provider: Provider) {
    this.provider = provider;
  }

  updateEPG(epg: EPG) {
    this.epg = epg;
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

  updateThumbnail(path: string) {
    this.thumbnail = new Thumbnail(path);
    return this;
  }

  setCategoriesWeight(weightRelations: Array<WeightRelation>) {
    weightRelations.forEach((weightRelation) => {
      this.categoriesWeight?.set(weightRelation.id, weightRelation.weight ?? this.lcn);
    });
  }

  updateRelationsWeight() {
    this.categories = this.categories?.map((category) => (
      Category.create({
        ...category,
        weight: this.categoriesWeight?.get(category.id) ?? this.lcn,
      }, category.id)
    ));
  }

  static create(props: Required<OmittedChannelProps>, id: string): Channel {
    return new Channel(props, id);
  }
}
