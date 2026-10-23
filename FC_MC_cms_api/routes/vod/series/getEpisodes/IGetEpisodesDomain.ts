import { EpisodePage } from '../../episode/shared/IEpisodeRepository';

export interface IGetEpisodesDomain {
  getEpisodes(seriesId: string): Promise<EpisodePage>
}
