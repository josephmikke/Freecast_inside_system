import Genre from '../shared/Genre';
import { IGenreRepository } from '../shared/IGenreRepository';

import { IGetGenresDomain } from './IGetGenresDomain';

export default class GetGenresDomain implements IGetGenresDomain {
  private readonly repository: IGenreRepository;

  constructor(repository: IGenreRepository) {
    this.repository = repository;
  }

  async getGenres(): Promise<Genre[]> {
    return this.repository.findAll();
  }
}
