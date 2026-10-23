import { Event } from '@middy/http-json-body-parser';

import { EPGProgram } from '../../epg/shared/IParser';

export enum RecordingStatus {
  'STARTED' = 'STARTED',
  'PENDING' = 'PENDING',
  'QUEUED' = 'QUEUED',
  'SUCCEEDED' = 'SUCCEEDED',
  'FAILED' = 'FAILED',
}

export type RecordingRequestDto = {
  channel: string;
  username: string;
  program: EPGProgram | string;
  startTime?: string ;
};

export type RecordingDestination = {
  hls: string;
  dash: string;
};

export type RecordingDto = {
  id: string;
  extId: string;
  createdAt?: string;
  updatedAt?: string;
  status?: RecordingStatus;
  dashStatus?: RecordingStatus;
  hlsStatus?: RecordingStatus;
  destination: RecordingDestination;
  failureReason?: string;
  enabled?: boolean;
} & RecordingRequestDto;

export type ScheduleRecordingEvent = {
  body: RecordingRequestDto
} & Event;

export type HarvestJob = {
  harvest_job: {
    id: string;
    status: RecordingStatus;
    start_time: string;
    end_time: string;
    channel_id: string;
    s3_destination: {
      bucket_name: string;
      manifest_key: string;
      role_arn: string;
    },
    origin_endpoint_id: string;
  }
};

export type RecordingEvent = {
} & HarvestJob;

export type GetRecordingsEvent = {
  pathParameters: {
    username: string;
  }
} & Event;

export type GetRecordingEvent = {
  pathParameters: {
    username: string;
    id: string
  }
} & Event;

export type DeleteRecordingsEvent = {
  pathParameters: {
    username: string;
  },
  body: {
    ids: string[]
  }
} & Event;

export type SystemDeleteRecordingsEvent = {
  pathParameters: {
    id: string;
  },
} & Event;

/**
 * The persisted shape: `startTime` stays optional (it is absent on recordings created
 * before it existed and is not carried by the Recording entity); everything else is
 * mandatory once the record has been written.
 */
export type PersistedRecordingDto = Required<Omit<RecordingDto, 'startTime'>>
  & Pick<RecordingDto, 'startTime'>;
