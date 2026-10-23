import { Event } from '@middy/http-json-body-parser';

export enum EpgTemplateType {
  JSON = 'JSON',
  CSV = 'CSV',
  XML = 'XML',
}

export type EPGTemplateRequestDto = {
  name: string;
  extId: string;
  mapping: Object
  templateType: EpgTemplateType
};

export type EPGTemplateDto = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
} & EPGTemplateRequestDto;

export type GetEPGTemplatesEvent = {
} & Event;

export type UpdateEPGTemplateEvent = {
  body: Partial<EPGTemplateRequestDto>
  pathParameters: {
    id: string;
  }
} & Event;

export type DeleteEPGTemplateEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type AddEPGTemplateEvent = {
  body: EPGTemplateRequestDto
} & Event;
