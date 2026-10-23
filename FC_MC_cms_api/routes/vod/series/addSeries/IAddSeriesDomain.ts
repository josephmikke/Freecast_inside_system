import { SeriesRequestDto } from '../../../shared/dto/vod/SeriesDto';
import Series from '../shared/Series';

export interface IAddSeriesDomain {
  addNewSeries(series: SeriesRequestDto): Promise<Series>
}
