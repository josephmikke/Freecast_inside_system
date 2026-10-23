import { MrssEpisode, MrssMovie, MrssSeries } from '../../../shared/dto/MrssDto';

export interface IMrssFactory<T, U> {
  createSeries(attr: T, mappingTemplate: U): MrssSeries;
  createEpisode(attr: T, mappingTemplate: U): MrssEpisode;
  createMovie(attr: T, mappingTemplate: U): MrssMovie;
}
