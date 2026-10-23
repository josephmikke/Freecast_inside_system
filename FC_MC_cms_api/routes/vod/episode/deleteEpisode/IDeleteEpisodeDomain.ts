export interface IDeleteEpisodeDomain {
  deleteEpisode(id: string): Promise<void>
}
