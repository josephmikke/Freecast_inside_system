import { GenreRequestDto } from '../../shared/dto/GenreDto';
import Genre from '../shared/Genre';

export interface IAddGenreDomain {
  addNewGenre(genre: GenreRequestDto): Promise<Genre>
}
