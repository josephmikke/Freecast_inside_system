import { MovieRating } from '../../asset/shared/Rating';

export interface EPGProgram {
  // TODO: add id attribute with uid value for each programs
  id: string;
  title: string;
  subtitle: string | null;
  slug: string;
  description: string;
  start_time: string;
  end_time: string;
  duration: string;
  thumbnail: string | null;
  alternateThumbnail: string | null;
  ext_id: string;
  catchup: boolean;
  rating: MovieRating | null;
  archive: boolean;
}

export interface EPGProgramRequest {
  title: string;
  subtitle?: string | null;
  slug: string;
  description: string;
  start_time: string;
  end_time: string;
  duration: string;
  thumbnail?: string | null;
  alternateThumbnail?: string | null;
  ext_id: string;
  catchup?: boolean;
  rating: MovieRating | null;
  archive?: boolean;
}

export interface IParser<T, U> {
  fetch(url: string): Promise<T>;
  parse(payload: Object, mappingTemplate: Object): Array<U>;
}

export interface IAsyncParser<T, U> {
  fetch(url: string): Promise<T>;
  parse(payload: Object, mappingTemplate: Object): Promise<Array<U>>;
}

export interface GenericObject {
  [key: string]: any,
}
