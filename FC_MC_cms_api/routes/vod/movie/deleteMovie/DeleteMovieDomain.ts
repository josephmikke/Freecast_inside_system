import { IPublisher } from '../../../shared/interfaces/IPublisher';
import { IStorageAdaptor } from '../../../shared/interfaces/IStorageAdaptor';
import { PublisherEvent } from '../../../shared/PublisherAdaptor';
import { IMovieRepository } from '../shared/IMovieRepository';
import { MovieError } from '../shared/MovieError';

import { IDeleteMovieDomain } from './IDeleteMovieDomain';
import {ILogTracker} from "../../../shared/tracker/ILogTracker";
import {TrackDto} from "../../../shared/tracker/LogTrackAdaptor";
import {LogEntity, LogEvent} from "../../../shared/dto/LogDto";

export default class DeleteMovieDomain implements IDeleteMovieDomain {
  constructor(
    private readonly repository: IMovieRepository,
    private readonly fileStorage: IStorageAdaptor,
    private readonly publisherAdaptor: IPublisher<PublisherEvent>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

  async deleteMovie(id: string): Promise<void> {
    const movie = await this.repository.findOne(id);
    if (!movie) throw new MovieError.MovieNotFound();
    await this.fileStorage.remove(movie.thumbnail.value());
    if (movie.alternateThumbnail) {
      await this.fileStorage.remove(movie.alternateThumbnail.value());
    }
    if (movie.backgroundThumbnail) {
      await this.fileStorage.remove(movie.backgroundThumbnail.value());
    }
    const deleted = await this.repository.remove(movie);
    if (!deleted) throw new MovieError.UnableToRemoveMovie();

    await this.publisherAdaptor.publish({
      eventType: 'MOVIE_DELETED',
      payload: movie.id,
    });

    await this.logTracker.track({
      entity: LogEntity.MOVIE,
      event: LogEvent.DELETE,
      entityId: movie.id,
    });
  }
}
