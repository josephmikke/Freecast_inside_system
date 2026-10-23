import { CommonEntityResult, ThumbnailResult } from '@entities/common';
import { EPGTemplateResult } from '@entities/content/epgtemplate';

interface EPGResult extends CommonEntityResult {
  epgTemplate: EPGTemplateResult;
  programs: any[];
  ingestionSchedule: string;
  timezone: string;
  thumbnail: ThumbnailResult;
  ingestionUrl: string;
  id: string;
}

// eslint-disable-next-line import/prefer-default-export
export type { EPGResult };
