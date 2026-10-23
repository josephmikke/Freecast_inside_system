import { StreamProps } from '../StreamDto';

import { VodDto, VodQueryParameters } from './VodDto';

export interface MovieRequestDto extends VodDto {
  streams: Array<string | StreamProps>;
}

export interface MovieDto extends MovieRequestDto {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
  exclude?: string;
}

export type AddMovieEvent = {
  body: MovieRequestDto
} & Event;

export type DeleteMovieEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type GetMovieEvent = {
  pathParameters: {
    id: string;
  },
} & Event;

export type GetMoviesEvent = {
  queryStringParameters: VodQueryParameters;
} & Event;

export type UpdateMovieBody = Omit<Partial<MovieRequestDto>, 'streams'> & {
  streams?: Array<string | Partial<StreamProps>>
};

export type UpdateMovieEvent = {
  body: UpdateMovieBody,
  pathParameters: {
    id: string;
  }
} & Event;
