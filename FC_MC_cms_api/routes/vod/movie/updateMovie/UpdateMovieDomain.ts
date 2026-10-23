import { StreamProps } from '../../../shared/dto/StreamDto';
import { MovieDto, MovieRequestDto, UpdateMovieBody } from '../../../shared/dto/vod/MovieDto';
import ICDNAdaptor from '../../../shared/interfaces/ICDNAdaptor';
import { IFactory } from '../../../shared/interfaces/IFactory';
import { IPublisher } from '../../../shared/interfaces/IPublisher';
import { IStorageAdaptor } from '../../../shared/interfaces/IStorageAdaptor';
import { PublisherEvent } from '../../../shared/PublisherAdaptor';
import Thumbnail from '../../../shared/valueObjects/Thumbnail';
import { StreamError } from '../../../stream/shared/StreamError';
import { IMovieRepository } from '../shared/IMovieRepository';
import Movie from '../shared/Movie';
import { MovieError } from '../shared/MovieError';
import MovieFactory from '../shared/MovieFactory';

import { IUpdateMovieDomain } from './IUpdateMovieDomain';
import {ILogTracker} from "../../../shared/tracker/ILogTracker";
import {TrackDto} from "../../../shared/tracker/LogTrackAdaptor";
import {LogEntity, LogEvent} from 'routes/shared/dto/LogDto';

export default class UpdateMovieDomain implements IUpdateMovieDomain {
  private readonly repository: IMovieRepository;

  private readonly movieFactory: IFactory<Movie, MovieRequestDto, MovieDto>;

  constructor(
    repository: IMovieRepository,
    movieFactory: IFactory<Movie, MovieRequestDto, MovieDto>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly cdnAdaptor: ICDNAdaptor,
    private readonly publisherAdaptor: IPublisher<PublisherEvent>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.movieFactory = movieFactory;
  }

  private static isExternalSlugDifferent(original: Movie, updated: Partial<MovieRequestDto>) {
    return updated.slug && original.slug !== updated.slug;
  }

  private async updateNewProps(movie: Movie, newProps: Partial<MovieRequestDto>) {
    // We replace base64 payload by image path is an update is required
    let pathThumbnail = movie.thumbnail.value();
    let pathAlternateThumbnail = movie.alternateThumbnail?.value();
    let pathBackgroundThumbnail = movie.backgroundThumbnail?.value();
    const modifiedThumbnails = [];

    if (newProps.thumbnail) {
      const thumbnail = new Thumbnail(newProps.thumbnail);
      pathThumbnail = await this.fileStorage.store(
        `movies/${movie.id}`,
        thumbnail.value(),
        'thumbnail',
      );
      await modifiedThumbnails.push(`/${pathThumbnail}`);
    }
    if (newProps.alternateThumbnail) {
      const thumbnail = new Thumbnail(newProps.alternateThumbnail);
      pathAlternateThumbnail = await this.fileStorage.store(
        `movies/${movie.id}`,
        thumbnail.value(),
        'alternate-thumbnail',
      );
      await modifiedThumbnails.push(`/${pathAlternateThumbnail}`);
    }
    if (newProps.backgroundThumbnail) {
      const thumbnail = new Thumbnail(newProps.backgroundThumbnail);
      pathBackgroundThumbnail = await this.fileStorage.store(
        `movies/${movie.id}`,
        thumbnail.value(),
        'background-thumbnail',
      );
      await modifiedThumbnails.push(`/${pathBackgroundThumbnail}`);
    }

    try {
      await this.cdnAdaptor.invalidateCache(modifiedThumbnails);
    } catch (e) {
      console.error(e);
    }
    return {
      ...newProps,
      thumbnail: pathThumbnail,
      alternateThumbnail: pathAlternateThumbnail,
      backgroundThumbnail: pathBackgroundThumbnail,
      updatedAt: new Date().toISOString(),
    };
  }

  static streamHasId(streamProp: Partial<StreamProps>): boolean {
    return 'id' in streamProp;
  }

  static isValidStreamProps(streamProp: Partial<StreamProps>): boolean {
    return 'name' in streamProp && 'type' in streamProp && 'format' in streamProp && 'data' in streamProp && 'daiParams' in streamProp;
  }

  private async updateNewStreams(movie: Movie, newProps: UpdateMovieBody) {
    const { streams } = movie;

    if (streams === undefined) throw new MovieError.UnableToUpdateMovie();

    if (newProps.streams) {
      const existingStreams = streams.filter(
        (stream) => newProps.streams?.includes(stream.id),
      ) ?? [];
      const newStreams = (newProps.streams.filter(
        (stream) => typeof stream !== 'string',
      ) as Array<Partial<StreamProps>>).map(
        (stream) => {
          if (UpdateMovieDomain.streamHasId(stream)) {
            const existingStream = streams.find((streamItem) => streamItem.id === stream.id);

            if (existingStream) {
              return {
                ...existingStream,
                ...stream,
                updatedAt: new Date().toISOString(),
              };
            }
            throw new StreamError.UnknownStreamDependency(`${stream.id} not found.`);
          } else if (UpdateMovieDomain.isValidStreamProps(stream)) {
            return stream;
          }
          throw new StreamError.MalformedStreamDependency();
        },
      ) as Array<StreamProps>;
      return [...existingStreams, ...newStreams];
    }
    return streams;
  }

  async updateMovie(id: string, newProps: Partial<MovieRequestDto>): Promise<void> {
    const movie = await this.repository.findOne(id);
    if (!movie) {
      throw new MovieError.MovieNotFound();
    }
    const props = await this.updateNewProps(movie, newProps);
    if (UpdateMovieDomain.isExternalSlugDifferent(movie, props)) {
      const updatedMovie = Object.assign({}, movie, props);
      if (await this.repository.exists(updatedMovie)) {
        throw new MovieError.MovieAlreadyExist();
      }
    }
    const updatedMovieDto = Object.assign(
      {},
      this.movieFactory.toPersistence(movie),
      props,
    );
    const updatedStreams = await this.updateNewStreams(movie, props);
    try {
      await this.repository.remove(movie);
      const updatedMovie = await this.movieFactory.toDomain({
        ...updatedMovieDto,
        // toPersistence keeps only category ids; pass the loaded categories to keep their weights
        categories: props.categories ?? movie.categories ?? [],
        streams: updatedStreams,
        isIngest: false,
      });
      if (updatedMovie.shouldDeactivate()) updatedMovie.updateEnabled(false);
      const isUpdated = await this.repository.save(updatedMovie);
      if (!isUpdated) throw new MovieError.UnableToUpdateMovie();
      if (newProps.packages) {
        await this.publisherAdaptor.publish({
          eventType: 'MOVIE_UPDATED',
          payload: newProps.packages,
        });
      }

      await this.logTracker.track({
        event: LogEvent.UPDATE,
        entity: LogEntity.MOVIE,
        entityId: movie.id,
      });
    } catch (e) {
      await (this.movieFactory as MovieFactory).removeStreams();
      const originalMovie = await this.movieFactory.toDomain({
        ...this.movieFactory.toPersistence(movie),
        categories: movie.categories ?? [],
        streams: movie.streams ?? [],
      });
      if (originalMovie.shouldDeactivate()) originalMovie.updateEnabled(false);
      await this.repository.save(originalMovie);
      throw e;
    }
  }
}
