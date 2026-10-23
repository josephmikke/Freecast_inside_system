import { GenreDto, GenreRequestDto } from '../../shared/dto/GenreDto';
import { IMapper } from '../../shared/interfaces/IMapper';
import Genre from '../shared/Genre';
import { GenreError } from '../shared/GenreError';
import { IGenreRepository } from '../shared/IGenreRepository';

import { IUpdateGenreWeightDomain } from './IUpdateGenreWeightDomain';

export default class UpdateGenreWeightDomain implements IUpdateGenreWeightDomain {
  private readonly repository: IGenreRepository;

  private readonly genreMap: IMapper<Genre, GenreRequestDto, GenreDto>;

  private static NOT_FOUND = 0;

  constructor(
    repository: IGenreRepository,
    genreMap: IMapper<Genre, GenreRequestDto, GenreDto>,
  ) {
    this.repository = repository;
    this.genreMap = genreMap;
  }

  private changePosition(genres: Genre[], initialIndex: number, newIndex: number) {
    const [element] = genres.splice(initialIndex, 1);
    genres.splice(newIndex, 0, element);
    return genres.map((genre, key) => {
      genre.updateWeight(key);
      return genre;
    });
  }

  async updateGenreWeight(id: string, index: string): Promise<boolean> {
    const genres = await this.repository.findAll();
    const initialIndex = genres.findIndex((genre) => genre.id === id);
    if (initialIndex < UpdateGenreWeightDomain.NOT_FOUND) {
      throw new GenreError.GenreNotFound();
    }
    const newArr = this.changePosition(genres, initialIndex, parseInt(index, 10));
    return this.repository.updateWeight(newArr);
  }
}
