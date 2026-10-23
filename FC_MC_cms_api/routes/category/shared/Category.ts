import { CategoryDto } from '../../shared/dto/CategoryDto';
import Asset from '../../shared/interfaces/Asset';

export default class Category extends Asset {
  public readonly name: string;

  public weight: number;

  private constructor(props: Required<Omit<CategoryDto, 'id'>>, id: string) {
    super(props, id);
    this.name = props.name;
    this.weight = props.weight;
  }

  static create(props: Required<Omit<CategoryDto, 'id'>>, id: string): Category {
    return new Category(props, id);
  }

  updateWeight(weight: number) {
    this.weight = weight;
  }
}
