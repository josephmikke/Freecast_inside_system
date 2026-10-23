export interface IDeleteMovieDomain {
  deleteMovie(id: string): Promise<void>
}
