export interface IUpdateGenreWeightDomain {
  updateGenreWeight(id: string, index: string): Promise<boolean>
}
