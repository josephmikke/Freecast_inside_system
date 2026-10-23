import { VodParameters } from '../../../shared/dto/vod/VodDto';

import Series from './Series';
import SeriesFactory from './SeriesFactory';

export interface SeriesPage {
  series: Array<Series>,
  nextToken?: string;
}

export interface ISeriesRepository {
  findAll(seriesParams?: VodParameters): Promise<SeriesPage>
  findMany(ids: Array<string>): Promise<Array<Series>>
  findOne(id: string): Promise<Series | undefined>
  findBy(attribute: string, search: string): Promise<Array<Series>>
  hasRelationships(item: Series): Promise<boolean>
  remove(item: Series): Promise<boolean>
  save(series: Series): Promise<boolean>
  batchSave(items: Series[]): Promise<void>
  updateEpisodes(seriesId: string, episodes: Array<string>): Promise<boolean>
  exists(series: Series): Promise<boolean>
  getFactory(): SeriesFactory
}
