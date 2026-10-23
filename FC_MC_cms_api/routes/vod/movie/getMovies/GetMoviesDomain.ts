import { VodQueryParameters } from '../../../shared/dto/vod/VodDto';
import { MoviePage, IMovieRepository } from '../shared/IMovieRepository';
import Movie from '../shared/Movie';

import { IGetMoviesDomain } from './IGetMoviesDomain';

export default class GetMoviesDomain implements IGetMoviesDomain {
  private readonly repository: IMovieRepository;

  constructor(
    repository: IMovieRepository,
  ) {
    this.repository = repository;
  }

  async getMovies(moviesParams: VodQueryParameters): Promise<MoviePage> {
    const moviePage = await this.repository.findAll({
      filter: {
        active: moviesParams.active !== undefined ? moviesParams.active === 'true' : undefined,
        categories: moviesParams.categories?.split(','),
        packages: moviesParams.packages?.split(','),
        platforms: moviesParams.platforms?.split(','),
        providers: moviesParams.providers?.split(','),
      },
      search: moviesParams.search,
      sort: {
        attr: moviesParams.sortType,
        order: moviesParams.sortOrder,
      },
      limit: moviesParams.limit ? parseInt(moviesParams.limit, 10) : undefined,
      exclude: moviesParams.exclude?.replaceAll('streams', ''),
      nextToken: moviesParams.nextToken,
    });

    // const moviesToSave: Array<Movie> = [];
    // moviePage.movies.forEach((movie) => {
    //   if (movie.shouldDeactivate() && movie.enabled) {
    //     movie.updateEnabled(false);
    //     moviesToSave.push(movie);
    //   }
    // });

    // if (moviesToSave.length > 0) {
    //   await this.repository.batchSave(moviesToSave);
    // }

    return moviePage;
  }
}
