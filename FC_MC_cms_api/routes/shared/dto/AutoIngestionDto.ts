import { Event } from '@middy/http-json-body-parser';

export type AutoIngestionRequestDto = {
  providerID?: string;
  provider_name?: string;
  package_ids?: string[];
  package_name?: string | string[];
  platform_ids?: string[];
  platform?: string | string[];
  mrss_feed: string;
  schedule: string;
  timezone?: string;
};

export type AutoIngestionDto = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
  providerID: string;
  package_ids: string[];
  platform_ids: string[];
  mrss_feed: string;
  schedule: string;
  timezone: string;
  ingestion_ids: string[];
  scheduler_id: string;
};

export type GetAutoIngestionsEvent = {
} & Event;

export type GetAutoIngestionEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type AddAutoIngestionEvent = {
  body: AutoIngestionRequestDto
} & Event;

export type UpdateAutoIngestionEvent = {
  body: Partial<AutoIngestionRequestDto> & { enabled?: boolean }
  pathParameters: {
    id: string;
  }
} & Event;

export type DeleteAutoIngestionEvent = {
  pathParameters: {
    id: string;
  }
} & Event;
