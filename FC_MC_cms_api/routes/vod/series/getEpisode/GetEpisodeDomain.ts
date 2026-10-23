import Episode from '../../episode/shared/Episode';
import { EpisodeError } from '../../episode/shared/EpisodeError';
import { ISeriesRepository } from '../shared/ISeriesRepository';
import { SeriesError } from '../shared/SeriesError';

import { IGetEpisodeDomain } from './IGetEpisodeDomain';

export default class GetEpisodeDomain implements IGetEpisodeDomain {
  private readonly repository: ISeriesRepository;

  constructor(
    repository: ISeriesRepository,
  ) {
    this.repository = repository;
  }

  async getEpisode(seriesId: string, episodeId: string): Promise<Episode> {
    const series = await this.repository.findOne(seriesId);
    if (!series) throw new SeriesError.SeriesNotFound();

    const episode = series.episodes?.find((episodeItem) => episodeItem.id === episodeId);
    if (!episode) throw new EpisodeError.EpisodeNotFound();

    return episode;
  }
}
