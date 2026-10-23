export interface IDeleteSeriesDomain {
  deleteSeries(id: string): Promise<void>
}
