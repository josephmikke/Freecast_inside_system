import { PlatformDto } from '../../shared/dto/PlatformDto';
import Asset from '../../shared/interfaces/Asset';

export default class Platform extends Asset {
  public readonly name: string;

  private constructor(props: Required<Omit<PlatformDto, 'id'>>, id: string) {
    super(props, id);
    this.name = props.name;
  }

  static create(props: Required<Omit<PlatformDto, 'id'>>, id: string): Platform {
    return new Platform(props, id);
  }
}
