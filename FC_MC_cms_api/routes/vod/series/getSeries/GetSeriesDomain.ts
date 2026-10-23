import { ISeriesRepository } from '../shared/ISeriesRepository';
import Series from '../shared/Series';
import { SeriesError } from '../shared/SeriesError';

import { IGetSeriesDomain } from './IGetSeriesDomain';

export default class GetSeriesDomain implements IGetSeriesDomain {
  private readonly repository: ISeriesRepository;

  constructor(
    repository: ISeriesRepository,
  ) {
    this.repository = repository;
  }

  async getSeries(id: string): Promise<Series> {
    const series = await this.repository.findOne(id);

    if (!series) throw new SeriesError.SeriesNotFound();

    if (series.shouldDeactivate() && series.enabled) {
      series.updateEnabled(false);
      await this.repository.save(series);
    }

    return series;
  }
}
