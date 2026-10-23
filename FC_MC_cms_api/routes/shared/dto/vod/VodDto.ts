import { MovieRating } from '../../../asset/shared/Rating';
import {
  SortType, SortOrder, SortParameters, WeightRelation,
} from '../ChannelDto';

export interface VodDto {
  name: string;
  extId?: string;
  imdbId?: string;
  slug: string;
  tmdbId?: string;
  vastId?: string;
  provider: string;
  availableDate: string;
  expirationDate?: string;
  description: string,
  releaseYear?: string,
  platforms?: Array<string>;
  rating: MovieRating;
  packages: Array<string>;
  categories?: Array<string | WeightRelation>;
  distributors?: Array<string>;
  brands: Array<string>;
  genres?: Array<string>;
  locations?: Array<string>;
  thumbnail: string;
  alternateThumbnail?: string;
  backgroundThumbnail: string;
  contentData?: string;
  cast?: string;
  isIngest?: boolean;
  mediapackageIds?: Array<string>;
}

export type VodParameters = {
  filter?: {
    active?: boolean;
    categories?: Array<string>;
    packages?: Array<string>;
    platforms?: Array<string>;
    providers?: Array<string>;
  };
  search?: string;
  sort?: SortParameters;
  limit?: number;
  exclude?: string;
  nextToken?: string;
};

export type VodQueryParameters = {
  active?: 'true' | 'false';
  categories?: string;
  packages?: string;
  platforms?: string;
  providers?: string;
  search?: string;
  sortType?: SortType;
  sortOrder?: SortOrder;
  limit?: string;
  exclude?: string;
  nextToken?: string;
};

export enum VodType {
  MOVIE = 'MOVIE',
  SERIES = 'SERIES',
  EPISODE = 'EPISODE',
}

export interface IVod {
  type: VodType;
}
