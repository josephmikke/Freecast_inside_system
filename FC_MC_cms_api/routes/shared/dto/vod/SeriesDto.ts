import { VodDto, VodQueryParameters } from './VodDto';

export interface SeriesRequestDto extends VodDto {
  episodes?: Array<string>;
}

export interface SeriesDto extends SeriesRequestDto {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
  exclude?: string;
}

export type AddSeriesEvent = {
  body: SeriesRequestDto
} & Event;

export type DeleteSeriesEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type GetSeriesEvent = {
  pathParameters: {
    id: string;
  },
} & Event;

export type GetAllSeriesEvent = {
  queryStringParameters: VodQueryParameters;
} & Event;

export type UpdateSeriesEvent = {
  body: Partial<SeriesRequestDto>,
  pathParameters: {
    id: string;
  }
} & Event;
