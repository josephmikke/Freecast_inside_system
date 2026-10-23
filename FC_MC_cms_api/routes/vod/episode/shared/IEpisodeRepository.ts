import { EpisodeParameters } from '../../../shared/dto/vod/EpisodeDto';

import Episode from './Episode';
import EpisodeFactory from './EpisodeFactory';

export interface EpisodePage {
  episodes: Array<Episode>,
  nextToken?: string;
}

export interface IEpisodeRepository {
  findAll(episodesParams?: EpisodeParameters): Promise<EpisodePage>
  findMany(ids: Array<string>): Promise<Array<Episode>>
  findOne(id: string): Promise<Episode | undefined>
  hasRelationships(episode: Episode): Promise<boolean>
  remove(episode: Episode): Promise<boolean>
  save(episode: Episode): Promise<boolean>
  exists(episode: Episode): Promise<boolean>
  getFactory(): EpisodeFactory
  appendMediapackageId(id: string, mediapackageId: string): Promise<void>
}
