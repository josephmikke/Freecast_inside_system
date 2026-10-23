import { EpisodeRequestDto } from '../../../shared/dto/vod/EpisodeDto';
import Episode from '../shared/Episode';

export interface IAddEpisodeDomain {
  addNewEpisode(episode: EpisodeRequestDto): Promise<Episode>
}
