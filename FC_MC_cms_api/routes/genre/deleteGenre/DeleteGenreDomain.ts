import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { GenreError } from '../shared/GenreError';
import { IGenreRepository } from '../shared/IGenreRepository';

import { IDeleteGenreDomain } from './IDeleteGenreDomain';

export default class DeleteGenreDomain implements IDeleteGenreDomain {
  private readonly repository: IGenreRepository;

  constructor(
    repository: IGenreRepository,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
  }

  async deleteGenre(id: string): Promise<boolean> {
    const genre = await this.repository.findOne(id);
    if (!genre) {
      throw new GenreError.GenreNotFound();
    }
    if (await this.repository.hasRelationships(genre)) {
      throw new GenreError.GenreHasDependencies();
    }
    await this.repository.remove(genre);
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.GENRE,
      entityId: genre.id,
    });
    const genres = await this.repository.findAll();
    const updatedGenres = genres.map((item, key) => {
      item.updateWeight(key);
      return item;
    });
    return this.repository.updateWeight(updatedGenres);
  }
}
