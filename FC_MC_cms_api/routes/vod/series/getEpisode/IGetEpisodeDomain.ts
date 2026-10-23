import Episode from '../../episode/shared/Episode';

export interface IGetEpisodeDomain {
  getEpisode(seriesId: string, episodeId: string): Promise<Episode>
}
