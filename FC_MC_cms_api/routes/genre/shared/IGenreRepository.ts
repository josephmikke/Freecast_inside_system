import Genre from './Genre';

export interface IGenreRepository {
  findAll(): Promise<Genre[]>
  findMany(ids: string[]): Promise<Genre[]>
  findOne(id: string): Promise<Genre | undefined>
  findBy(attribute: string, search: string): Promise<Array<Genre>>
  hasRelationships(genre: Genre): Promise<boolean>
  remove(genre: Genre): Promise<boolean>
  save(genre: Genre): Promise<boolean>
  exists(genre: Genre): Promise<boolean>
  updateWeight(genres: Genre[]): Promise<boolean>
}
