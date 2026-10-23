import { VodParameters } from '../../../shared/dto/vod/VodDto';

import Movie from './Movie';
import MovieFactory from './MovieFactory';
import Series from "../../series/shared/Series";

export interface MoviePage {
  movies: Array<Movie>,
  nextToken?: string;
}

export interface IMovieRepository {
  findAll(moviesParams?: VodParameters): Promise<MoviePage>
  findMany(ids: Array<string>): Promise<Array<Movie>>
  findOne(id: string): Promise<Movie | undefined>
  hasRelationships(item: Movie): Promise<boolean>
  remove(item: Movie): Promise<boolean>
  save(movie: Movie): Promise<boolean>
  batchSave(items: Movie[]): Promise<void>
  exists(movie: Movie): Promise<boolean>
  getFactory(): MovieFactory
  appendMediapackageId(id: string, mediapackageId: string): Promise<void>
}
