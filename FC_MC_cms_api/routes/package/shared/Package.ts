import Platform from '../../platform/shared/Platform';
import { PackageDto, PackageType, RevenueModel } from '../../shared/dto/PackageDto';
import Asset from '../../shared/interfaces/Asset';
import { ValueObject } from '../../shared/interfaces/ValueObject';
import Thumbnail from '../../shared/valueObjects/Thumbnail';

export default class Package extends Asset {
  public readonly name: string;

  public readonly type: PackageType;

  public readonly description: string;

  public readonly price: string;

  public readonly default: boolean;

  public readonly revenueModel: RevenueModel;

  public weight: number;

  public platforms: Array<Platform>;

  public thumbnail: ValueObject<Thumbnail>;

  private constructor(props: Required<Omit<PackageDto, 'id' | 'platforms'>>, id: string) {
    super(props, id);
    this.name = props.name;
    this.type = props.type;
    this.description = props.description;
    this.revenueModel = props.revenueModel;
    this.price = props.price;
    this.default = props.default;
    this.weight = props.weight;
    this.platforms = [];
    this.thumbnail = new Thumbnail(props.thumbnail);
  }

  addPlatform(platform: Platform) {
    this.platforms.push(platform);
    return this;
  }

  updateThumbnail(path: string) {
    this.thumbnail = new Thumbnail(path);
    return this;
  }

  updateWeight(weight: number) {
    this.weight = weight;
  }

  static create(props: Required<Omit<PackageDto, 'id' | 'platforms'>>, id: string): Package {
    return new Package(props, id);
  }
}
