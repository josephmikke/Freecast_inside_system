import { Event } from '@middy/http-json-body-parser';

import { Rating } from '../../asset/shared/Rating';

import { EPGQueryParameters, EPGProgramsParameters } from './EPGDto';
import { StreamProps } from './StreamDto';

export enum SortType {
  NAME = 'name',
  ID = 'id',
  UPDATED = 'updated',
  CREATED = 'created',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export type SortParameters = {
  attr?: SortType;
  order?: SortOrder;
};

export type ChannelsParameters = {
  filter?: {
    active?: boolean;
    categories?: Array<string>;
    packages?: Array<string>;
    platforms?: Array<string>;
    providers?: Array<string>;
    programs?: EPGProgramsParameters,
  };
  search?: string;
  sort?: SortParameters;
  limit?: number;
  exclude?: string;
  nextToken?: string;
};

export type WeightRelation = {
  id: string;
  weight?: number;
};

export interface ChannelProps {
  name: string;
  slug: string;
  lcn: number;
  rating: Rating;
  description: string;
  visible: boolean;
  catchUpActive: boolean;
  availableDate: string;
  thumbnail: string;
  provider: string;
  categories: Array<string | WeightRelation>;
  packages: Array<string>;
  streams: Array<string | StreamProps>;
}

export interface ChannelRequestDto extends ChannelProps {
  extId?: string;
  vastId?: string;
  expirationDate?: string;
  mediapackageId?: string;
  epg?: string;
  brands?: Array<string>;
  platforms?: Array<string>;
  genres?: Array<string>;
  locations?: Array<string>;
  distributors?: Array<string>;
}

export interface ChannelDto extends ChannelRequestDto {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  exclude?: string;
  enabled?: boolean;
}

export type AddChannelEvent = {
  body: ChannelRequestDto
} & Event;

export type GetChannelEvent = {
  pathParameters: {
    id: string;
  },
  queryStringParameters: EPGQueryParameters,
} & Event;

export type DeleteChannelEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type UpdateChannelBody = Omit<Partial<ChannelRequestDto>, 'streams'> & {
  streams?: Array<string | Partial<StreamProps>>
};

export type UpdateChannelEvent = {
  body: UpdateChannelBody,
  pathParameters: {
    id: string;
  }
} & Event;

export type ChannelQueryParameters = {
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
} & EPGQueryParameters;

export type GetChannelsEvent = {
  queryStringParameters: ChannelQueryParameters;
} & Event;
