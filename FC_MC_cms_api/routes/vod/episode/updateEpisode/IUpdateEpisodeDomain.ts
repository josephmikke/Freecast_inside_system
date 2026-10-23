import { UpdateEpisodeBody } from '../../../shared/dto/vod/EpisodeDto';

export interface IUpdateEpisodeDomain {
  updateEpisode(id: string, episode: UpdateEpisodeBody): Promise<void>
}
