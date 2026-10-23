import { Event } from '@middy/http-json-body-parser';

export type PlatformDto = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  name: string;
  extId: string;
  enabled?: boolean;
};

export type PlatformRequestDto = {
  name: string;
  extId: string;
  enabled?: boolean;
};

export type GetPlatformsEvent = {
} & Event;

export type UpdatePlatformEvent = {
  body: Partial<PlatformRequestDto>
  pathParameters: {
    id: string;
  }
} & Event;

export type DeletePlatformEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type AddPlatformEvent = {
  body: PlatformRequestDto
} & Event;
