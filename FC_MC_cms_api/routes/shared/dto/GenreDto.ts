import { Event } from '@middy/http-json-body-parser';

export type GenreRequestDto = {
  name: string;
  extId: string;
  enabled?: boolean;
};

export type GenreDto = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  weight: number;
} & GenreRequestDto;

export type GetGenresEvent = {
} & Event;

export type UpdateGenreEvent = {
  body: Partial<GenreRequestDto>
  pathParameters: {
    id: string;
  }
} & Event;

export type UpdateGenreWeightEvent = {
  pathParameters: {
    id: string;
    index: string;
  }
} & Event;

export type DeleteGenreEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type AddGenreEvent = {
  body: GenreRequestDto
} & Event;
