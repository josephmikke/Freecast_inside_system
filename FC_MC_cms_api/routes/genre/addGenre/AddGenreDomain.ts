import { GenreDto, GenreRequestDto } from '../../shared/dto/GenreDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IMapper } from '../../shared/interfaces/IMapper';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import Genre from '../shared/Genre';
import { GenreError } from '../shared/GenreError';
import { IGenreRepository } from '../shared/IGenreRepository';

import { IAddGenreDomain } from './IAddGenreDomain';

export default class AddGenreDomain implements IAddGenreDomain {
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

  async addNewGenre(genreDto: GenreRequestDto): Promise<Genre> {
    const genres = await this.repository.findAll();
    const genre = this.genreMap.toDomain({ ...genreDto, weight: genres.length });
    if (await this.repository.exists(genre)) {
      throw new GenreError.GenreAlreadyExist();
    }
    await this.repository.save(genre);
    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.GENRE,
      entityId: genre.id,
    });
    return genre;
  }
}
