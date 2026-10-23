import { IMovieRepository } from '../shared/IMovieRepository';
import Movie from '../shared/Movie';
import { MovieError } from '../shared/MovieError';

import { IGetMovieDomain } from './IGetMovieDomain';

export default class GetMovieDomain implements IGetMovieDomain {
  private readonly repository: IMovieRepository;

  constructor(
    repository: IMovieRepository,
  ) {
    this.repository = repository;
  }

  async getMovie(id: string): Promise<Movie> {
    const movie = await this.repository.findOne(id);

    if (!movie) throw new MovieError.MovieNotFound();

    if (movie.shouldDeactivate() && movie.enabled) {
      movie.updateEnabled(false);
      await this.repository.save(movie);
    }

    return movie;
  }
}
