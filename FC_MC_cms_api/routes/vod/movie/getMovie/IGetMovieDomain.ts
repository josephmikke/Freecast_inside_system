import Movie from '../shared/Movie';

export interface IGetMovieDomain {
  getMovie(id: string): Promise<Movie>
}
