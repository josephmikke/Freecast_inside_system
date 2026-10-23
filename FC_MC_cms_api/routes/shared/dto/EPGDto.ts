import { Event } from '@middy/http-json-body-parser';

import { EPGProgram, EPGProgramRequest } from '../../epg/shared/IParser';

export type EPGRequestDto = {
  name: string;
  extId: string;
  epgTemplate: string; // EPG template id
  ingestionUrl: string;
  ingestionSchedule: string; // Should be a CRON task
  timezone: string; // https://dayspedia.com/time-zone-map/
  thumbnail: string;
  programs?: EPGProgram[];
};

export type EPGDto = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  programs: EPGProgram[],
  enabled?: boolean;
} & EPGRequestDto;

export type EPGProgramsParameters = {
  filter: EPGQueryParameters;
  ignore: boolean;
};

export type EPGQueryParameters = {
  startTime?: string;
  endTime?: string;
};

export type GetEPGsEvent = {
  queryStringParameters: EPGQueryParameters;
} & Event;

export type GetEPGEvent = {
  queryStringParameters: EPGQueryParameters;
  pathParameters: {
    id: string;
  }
} & Event;

export type IngestEPGEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type UpdateEPGEvent = {
  body: Partial<EPGRequestDto>
  pathParameters: {
    id: string;
  }
} & Event;

export type UpdateEPGProgramEvent = {
  body: Partial<EPGProgram>
  pathParameters: {
    id: string;
    programId: string;
  }
} & Event;

export type DeleteEPGEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type AddEPGEvent = {
  body: EPGRequestDto
} & Event;

export type AddEPGProgramEvent = {
  body: EPGProgramRequest
  pathParameters: {
    id: string;
  }
} & Event;

export type DeleteAllEPGProgramEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type RepairEPGEvent = {
  pathParameters: {
    id: string;
  }
} & Event;
