import { GenreRequestDto } from '../../shared/dto/GenreDto';

export interface IUpdateGenreDomain {
  updateGenre(id: string, props: Partial<GenreRequestDto>): Promise<boolean>
}
