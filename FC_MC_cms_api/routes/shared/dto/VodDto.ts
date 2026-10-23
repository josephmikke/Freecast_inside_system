export type VodIngestScheduleRequestDto = {
  name: string;
  ingestionUrl: string;
  ingestionSchedule: string;
  timezone: string;
  mapping: Object
};

export type VodIngestScheduleDto = {
  id: string;
  extId: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
} & VodIngestScheduleRequestDto;

export type ScheduleVodIngestEvent = {
  body: VodIngestScheduleDto
} & Event;
