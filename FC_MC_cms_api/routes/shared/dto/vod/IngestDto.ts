import { MrssMappingTemplate } from '../MrssDto';
import { SortParameters, SortOrder, SortType } from '../ChannelDto';

export type IngestVodEvent = {
  body: {
    url: string,
    mapping: MrssMappingTemplate,
    provider?: string,
    packages?: Array<string>,
    brands?: Array<string>,
    distributors?: Array<string>,
    locations?: Array<string>,
    platforms?: Array<string>,
    isPrivate?: boolean,
  }
} & Event;

export type OutputGroupDetail = {
  playlistFilePaths: Array<string>;
  type: string;
};

export type IngestedVodEvent = {
  status: string,
  errorCode?: number,
  errorMessage?: string,
  jobId?: string,
  userMetadata: {
    ingestionId?: string;
    entityId?: string;
    media?: string;
  }
  outputGroupDetails: Array<OutputGroupDetail>;
};

export type AssetCreationVodEventParsed = {
  ingestionId: string,
  type: string,
  entityId: string,
};

export type AssetCreationVodEvent = {
  event: string,
  message: string,
  packaging_configuration_id?: string,
  manifest_urls?: Array<string>,
};

export type IngestVodInput = {
  type: IngestVodState,
  url: string,
  mapping: MrssMappingTemplate,
  ingestionParentId: string,
  isPrivate?: boolean,
  provider?: string,
  packages?: Array<string>,
  brands?: Array<string>,
  distributors?: Array<string>,
  locations?: Array<string>,
  platforms?: Array<string>,
  error?: string,
} & Event;

export enum IngestVodState {
  MAP_URL = 'MAP_URL',
  INGEST = 'INGEST',
  FAILURE = 'FAILURE',
  DONE = 'DONE',
}

export enum MrssIngestionStatus {
  FAILED = 'FAILED',
  IN_PROGRESS = 'IN_PROGRESS',
  SCHEDULED = 'SCHEDULED',
  SUCCESSFUL = 'SUCCESSFUL',
  COMPLETED = 'COMPLETED',
}

export enum MediaJobStatus {
  MEDIACONVERT_SUBMITTED = 'MEDIACONVERT_SUBMITTED',
  MEDIACONVERT_PROGRESSING = 'MEDIACONVERT_PROGRESSING',
  MEDIACONVERT_COMPLETE = 'MEDIACONVERT_COMPLETE',
  MEDIACONVERT_ERROR = 'MEDIACONVERT_ERROR',
  MEDIACONVERT_CANCELED = 'MEDIACONVERT_CANCELED',
  MEDIAPACKAGE_PROGRESSING = 'MEDIAPACKAGE_PROGRESSING',
  MEDIAPACKAGE_ERROR = 'MEDIAPACKAGE_ERROR',
  MEDIAPACKAGE_COMPLETE = 'MEDIAPACKAGE_COMPLETE',
  MEDIAPACKAGE_PLAYABLE = 'MEDIAPACKAGE_PLAYABLE',
  UNKNOWN = 'UNKNOWN',
}

export type IngestionRequestDto = {
  id?: string;
  extId: string;
  parentId: string;
  createdAt?: string;
  updatedAt?: string;
  status: MrssIngestionStatus;
  failures?: Array<string>;
  saved?: Array<string>;
  enabled?: boolean;
  jobs?: { [id: string]: MediaJobStatus };
};

export type IngestionParameters = {
  filter?: {
    status?: MrssIngestionStatus;
    parentId?: string;
    enabled?: boolean;
  };
  search?: string;
  sort?: SortParameters;
  limit?: number;
  nextToken?: string;
};

export type IngestionQueryParameters = {
  status?: MrssIngestionStatus;
  parentId?: string;
  enabled?: 'true' | 'false';
  search?: string;
  sortType?: SortType;
  sortOrder?: SortOrder;
  limit?: string;
  nextToken?: string;
};

export type IngestionDto = {
  id: string;
} & IngestionRequestDto;

export type GetIngestionEvent = {
  pathParameters: {
    id: string;
  },
} & Event;

export type GetIngestionsEvent = {
  queryStringParameters: IngestionQueryParameters;
} & Event;
