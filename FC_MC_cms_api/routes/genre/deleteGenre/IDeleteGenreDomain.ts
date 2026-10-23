export interface IDeleteGenreDomain {
  deleteGenre(id: string): Promise<boolean>
}
