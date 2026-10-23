import { Event } from '@middy/http-json-body-parser';

export enum ProviderContentType {
  CHANNELS = 'CHANNELS',
  VOD = 'VOD',
}

export enum ProviderNumberFormat {
  INTEGER = 'INTEGER',
  DECIMAL = 'DECIMAL',
  N_A = 'N/A',
}

export type ProviderRequestDto = {
  name: string;
  extId: string;
  configuration: Object;
  type: Array<ProviderContentType>
  subscription: boolean;
  format: ProviderNumberFormat
  enabled: boolean;
  mtSlug?: string;
  hlsMtSlug?: string;
  aidSlug?: string;
};

export type ProviderDto = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
} & ProviderRequestDto;

export type GetProvidersEvent = {
} & Event;

export type UpdateProviderEvent = {
  body: Partial<ProviderRequestDto>
  pathParameters: {
    id: string;
  }
} & Event;

export type DeleteProviderEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type AddProviderEvent = {
  body: ProviderRequestDto
} & Event;
