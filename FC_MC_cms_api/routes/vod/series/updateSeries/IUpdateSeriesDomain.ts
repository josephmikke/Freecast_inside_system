import { SeriesRequestDto } from '../../../shared/dto/vod/SeriesDto';

export interface IUpdateSeriesDomain {
  updateSeries(id: string, series: Partial<SeriesRequestDto>): Promise<void>
}
