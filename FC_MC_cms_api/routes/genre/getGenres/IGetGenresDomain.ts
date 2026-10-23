import Genre from '../shared/Genre';

export interface IGetGenresDomain {
  getGenres(): Promise<Genre[]>
}
