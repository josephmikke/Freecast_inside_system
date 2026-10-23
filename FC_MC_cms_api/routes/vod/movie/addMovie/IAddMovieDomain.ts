import { MovieRequestDto } from '../../../shared/dto/vod/MovieDto';
import Movie from '../shared/Movie';

export interface IAddMovieDomain {
  addNewMovie(movie: MovieRequestDto): Promise<Movie>
}
