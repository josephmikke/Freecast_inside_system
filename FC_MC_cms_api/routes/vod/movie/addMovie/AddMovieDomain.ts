import { MovieDto, MovieRequestDto } from '../../../shared/dto/vod/MovieDto';
import { IFactory } from '../../../shared/interfaces/IFactory';
import { IPublisher } from '../../../shared/interfaces/IPublisher';
import { IStorageAdaptor } from '../../../shared/interfaces/IStorageAdaptor';
import { PublisherEvent } from '../../../shared/PublisherAdaptor';
import { IMovieRepository } from '../shared/IMovieRepository';
import Movie from '../shared/Movie';
import { MovieError } from '../shared/MovieError';
import MovieFactory from '../shared/MovieFactory';

import { IAddMovieDomain } from './IAddMovieDomain';
import {ILogTracker} from "../../../shared/tracker/ILogTracker";
import {TrackDto} from "../../../shared/tracker/LogTrackAdaptor";
import {LogEntity, LogEvent} from "../../../shared/dto/LogDto";

export default class AddMovieDomain implements IAddMovieDomain {
  private readonly repository: IMovieRepository;

  private readonly movieFactory: IFactory<Movie, MovieRequestDto, MovieDto>;

  constructor(
    repository: IMovieRepository,
    movieFactory: IFactory<Movie, MovieRequestDto, MovieDto>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly publisherAdaptor: IPublisher<PublisherEvent>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.movieFactory = movieFactory;
  }

  async addNewMovie(movieDto: MovieRequestDto): Promise<Movie> {
    try {
      const movie = await this.movieFactory.toDomain(movieDto);

      if (await this.repository.exists(movie)) {
        (this.movieFactory as MovieFactory).removeStreams();
        throw new MovieError.MovieAlreadyExist();
      }
      try {
        const pathThumbnail = await this.fileStorage.store(`movies/${movie.id}`, movie.thumbnail.value(), 'thumbnail');
        movie.updateThumbnail(pathThumbnail);
      } catch (e) {
        (this.movieFactory as MovieFactory).removeStreams();
        throw new MovieError.UnableToSaveThumbnail();
      }
      try {
        if (movie.alternateThumbnail) {
          const pathAlternateThumbnail = await this.fileStorage.store(`movies/${movie.id}`, movie.alternateThumbnail.value(), 'alternate-thumbnail');
          movie.updateAlternateThumbnail(pathAlternateThumbnail);
        }
      } catch (e) {
        (this.movieFactory as MovieFactory).removeStreams();
        throw new MovieError.UnableToSaveThumbnail();
      }
      try {
        if (movie.backgroundThumbnail) {
          const pathBackgroundThumbnail = await this.fileStorage.store(`movies/${movie.id}`, movie.backgroundThumbnail.value(), 'background-thumbnail');
          movie.updateBackgroundThumbnail(pathBackgroundThumbnail);
        }
      } catch (e) {
        (this.movieFactory as MovieFactory).removeStreams();
        throw new MovieError.UnableToSaveThumbnail();
      }
      if (movie.shouldDeactivate()) movie.updateEnabled(false);
      await this.repository.save(movie);

      if (movie.packages) {
        await this.publisherAdaptor.publish({
          eventType: 'MOVIE_ADDED',
          payload: movie.packages.map((pkg) => pkg.id).join(','),
        });
      }

      await this.logTracker.track({
        event: LogEvent.INSERT,
        entity: LogEntity.MOVIE,
        entityId: movie.id,
      });
      return movie;
    } catch (e) {
      (this.movieFactory as MovieFactory).removeStreams();
      throw e;
    }
  }
}
