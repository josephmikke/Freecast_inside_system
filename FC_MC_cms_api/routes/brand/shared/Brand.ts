import { BrandDto } from '../../shared/dto/BrandDto';
// Test code 

export default class Brand {
  public readonly slug: string;

  public readonly name: string;

  public readonly domain: string;

  public readonly active: boolean;

  public readonly siteId: number;

  public readonly logoImage: string;

  public readonly logoImageDark: string;

  private constructor(props: BrandDto) {
    this.slug = props.slug;
    this.name = props.name;
    this.domain = props.domain;
    this.active = props.active;
    this.siteId = props.site_id;
    this.logoImage = props.logo_image;
    this.logoImageDark = props.logo_image_dark;
  }

  static create(props: BrandDto): Brand {
    return new Brand(props);
  }
}
