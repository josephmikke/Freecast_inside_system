import { EpisodePage } from '../../episode/shared/IEpisodeRepository';
import { ISeriesRepository } from '../shared/ISeriesRepository';
import { SeriesError } from '../shared/SeriesError';

import { IGetEpisodesDomain } from './IGetEpisodesDomain';

export default class GetEpisodesDomain implements IGetEpisodesDomain {
  private readonly repository: ISeriesRepository;

  constructor(
    repository: ISeriesRepository,
  ) {
    this.repository = repository;
  }

  async getEpisodes(seriesId: string): Promise<EpisodePage> {
    const series = await this.repository.findOne(seriesId);
    if (!series) throw new SeriesError.SeriesNotFound();

    return {
      episodes: series.episodes ?? [],
    };
  }
}
