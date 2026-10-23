import { GenreDto, GenreRequestDto } from '../../shared/dto/GenreDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IMapper } from '../../shared/interfaces/IMapper';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import Genre from '../shared/Genre';
import { GenreError } from '../shared/GenreError';
import { IGenreRepository } from '../shared/IGenreRepository';

import { IUpdateGenreDomain } from './IUpdateGenreDomain';

export default class UpdateGenreDomain implements IUpdateGenreDomain {
  private readonly repository: IGenreRepository;

  private readonly genreMap: IMapper<Genre, GenreRequestDto, GenreDto>;

  constructor(
    repository: IGenreRepository,
    genreMap: IMapper<Genre, GenreRequestDto, GenreDto>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.genreMap = genreMap;
  }

  async updateGenre(
    id: string,
    toUpdate: Partial<GenreRequestDto>,
  ): Promise<boolean> {
    const genre = await this.repository.findOne(id);
    if (!genre) {
      throw new GenreError.GenreNotFound();
    }
    if (toUpdate.extId && genre.extId !== toUpdate.extId) {
      if (await this.repository.exists(Object.assign({}, genre, { extId: toUpdate.extId }))) {
        throw new GenreError.GenreAlreadyExist();
      }
    }
    const updatedGenre = this.genreMap.toDto({
      ...genre,
      ...toUpdate,
      weight: genre.weight,
      updatedAt: new Date().toISOString(),
    });
    const isUpdated = this.repository.save(updatedGenre);
    await this.logTracker.track({
      event: LogEvent.UPDATE,
      entity: LogEntity.GENRE,
      entityId: updatedGenre.id,
    });
    return isUpdated;
  }
}
