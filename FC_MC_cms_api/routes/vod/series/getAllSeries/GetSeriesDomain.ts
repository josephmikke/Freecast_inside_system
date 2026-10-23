import { VodQueryParameters } from '../../../shared/dto/vod/VodDto';
import { SeriesPage, ISeriesRepository } from '../shared/ISeriesRepository';
import Series from '../shared/Series';

import { IGetSeriesDomain } from './IGetSeriesDomain';

export default class GetSeriesDomain implements IGetSeriesDomain {
  private readonly repository: ISeriesRepository;

  constructor(
    repository: ISeriesRepository,
  ) {
    this.repository = repository;
  }

  async getSeries(seriesParams: VodQueryParameters): Promise<SeriesPage> {
    const seriesPage = await this.repository.findAll({
      filter: {
        active: seriesParams.active !== undefined ? seriesParams.active === 'true' : undefined,
        categories: seriesParams.categories?.split(','),
        packages: seriesParams.packages?.split(','),
        platforms: seriesParams.platforms?.split(','),
        providers: seriesParams.providers?.split(','),
      },
      search: seriesParams.search,
      sort: {
        attr: seriesParams.sortType,
        order: seriesParams.sortOrder,
      },
      limit: seriesParams.limit ? parseInt(seriesParams.limit, 10) : undefined,
      exclude: seriesParams.exclude?.replaceAll('streams', ''),
      nextToken: seriesParams.nextToken,
    });

    const seriesToSave: Array<Series> = [];
    seriesPage.series.forEach((series) => {
      if (series.shouldDeactivate() && series.enabled) {
        series.updateEnabled(false);
        seriesToSave.push(series);
      }
    });

    if (seriesToSave.length > 0) {
      await this.repository.batchSave(seriesToSave);
    }

    return seriesPage;
  }
}
