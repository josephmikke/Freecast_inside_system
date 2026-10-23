import { VodQueryParameters } from '../../../shared/dto/vod/VodDto';
import { MoviePage } from '../shared/IMovieRepository';

export interface IGetMoviesDomain {
  getMovies(moviesParams: VodQueryParameters): Promise<MoviePage>
}
