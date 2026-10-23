import { VodQueryParameters } from '../../../shared/dto/vod/VodDto';
import { SeriesPage } from '../shared/ISeriesRepository';

export interface IGetSeriesDomain {
  getSeries(seriesParams: VodQueryParameters): Promise<SeriesPage>
}
