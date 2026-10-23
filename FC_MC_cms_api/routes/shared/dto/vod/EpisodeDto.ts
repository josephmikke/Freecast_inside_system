import { Rating } from '../../../asset/shared/Rating';
import { SortOrder, SortParameters, SortType } from '../ChannelDto';
import { StreamProps } from '../StreamDto';

export interface EpisodeRequestDto {
  thumbnail: string;
  alternateThumbnail?: string;
  name: string;
  season: string;
  number: number;
  slug: string;
  extId?: string;
  duration?: string; // hh:mm:ss
  availableDate: string;
  expirationDate?: string;
  originalAirDate: string;
  rating: Rating;
  description?: string;
  contentData?: string;
  cast?: string;
  streams: Array<string | StreamProps>;
  seriesId: string;
  isIngest?: boolean;
  mediapackageIds?: Array<string>;
}

export interface EpisodeDto extends EpisodeRequestDto {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
}

export type EpisodeQueryParameters = {
  active?: 'true' | 'false';
  search?: string;
  sortType?: SortType;
  sortOrder?: SortOrder;
  limit?: string;
  exclude?: string;
  nextToken?: string;
};

export type EpisodeParameters = {
  filter?: {
    active?: boolean;
  };
  search?: string;
  sort?: SortParameters;
  limit?: number;
  exclude?: string;
  nextToken?: string;
};

export type AddEpisodeEvent = {
  body: EpisodeRequestDto;
} & Event;

export type DeleteEpisodeEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type GetEpisodeEvent = {
  pathParameters: {
    id: string;
    episodeId: string;
  },
} & Event;

export type GetEpisodesEvent = {
  pathParameters: {
    id: string;
  },
  queryStringParameters: EpisodeQueryParameters;
} & Event;

export type UpdateEpisodeBody = Omit<Partial<EpisodeRequestDto>, 'streams'> & {
  streams?: Array<string | Partial<StreamProps>>
};

export type UpdateEpisodeEvent = {
  body: UpdateEpisodeBody,
  pathParameters: {
    id: string;
  }
} & Event;
