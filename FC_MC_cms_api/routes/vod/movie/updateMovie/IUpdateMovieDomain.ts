import { UpdateMovieBody } from '../../../shared/dto/vod/MovieDto';

export interface IUpdateMovieDomain {
  updateMovie(id: string, movie: UpdateMovieBody): Promise<void>
}
