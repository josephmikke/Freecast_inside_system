import { Event } from '@middy/http-json-body-parser';

export enum LogEvent {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum LogEntity {
  MOVIE = 'MOVIE',
  SERIES = 'SERIES',
  EPISODE = 'EPISODE',
  SEASON = 'SEASON',
  CHANNEL = 'CHANNEL',
  VOD = 'VOD',
  EPG = 'EPG',
  EPG_PROGRAM = 'EPG_PROGRAM',
  EPG_TEMPLATE = 'EPG_TEMPLATE',
  PACKAGE = 'PACKAGE',
  LOCATION = 'LOCATION',
  GENRE = 'GENRE',
  BRAND = 'BRAND',
  DISTRIBUTOR = 'DISTRIBUTOR',
  PROVIDER = 'PROVIDER',
  PLATFORM = 'PLATFORM',
  CATEGORY = 'CATEGORY',
  GEOIP_RULE = 'GEOIP_RULE',
  AUTOINGESTION = 'AUTOINGESTION',
}

export interface LogRequestDto {
  event: string;
  entity: string;
  entityId?: string;
  user?: string;
  extId?: string;
}

export interface LogDto extends LogRequestDto {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
}

export type LogQueryParameters = {
  limit?: string;
  nextToken?: string;
};

export type LogParameters = {
  limit?: number;
  nextToken?: string;
};

export type TrackLogEvent = LogRequestDto;

export type GetLogsEvent = {
  queryStringParameters: LogQueryParameters;
} & Event;
