import { GenreDto } from '../../shared/dto/GenreDto';
import Asset from '../../shared/interfaces/Asset';

export default class Genre extends Asset {
  public readonly name: string;

  public weight: number;

  private constructor(props: Required<Omit<GenreDto, 'id'>>, id: string) {
    super(props, id);
    this.name = props.name;
    this.weight = props.weight;
  }

  static create(props: Required<Omit<GenreDto, 'id'>>, id: string): Genre {
    return new Genre(props, id);
  }

  updateWeight(weight: number) {
    this.weight = weight;
  }
}
