import Series from '../shared/Series';

export interface IGetSeriesDomain {
  getSeries(id: string): Promise<Series>
}
