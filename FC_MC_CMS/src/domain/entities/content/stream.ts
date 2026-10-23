import { CommonEntityPayload, CommonEntityResult } from '@entities/common';

export type StreamType = 'STREAM' | 'EMBED_CODE' | 'SOURCE_URL' | 'VIDILLION';
export type StreamFormat = 'DASH' | 'DASH_DRM' | 'HLS' | 'HLS_DRM';

export const StreamTypesValues = [
  { value: 'STREAM', label: 'Stream' },
  { value: 'EMBED_CODE', label: 'Embed Code' },
  { value: 'SOURCE_URL', label: 'Source URL' },
  { value: 'VIDILLION', label: 'Vidillion' },
];

export const StreamsFormatValues = [
  { value: 'HLS', label: 'HLS Non-DRM' },
  { value: 'DASH', label: 'DASH Non-DRM' },
  { value: 'HLS_DRM', label: 'HLS / Fairplay' },
  { value: 'DASH_DRM', label: 'DASH / Widevine' },
];

export interface StreamResult extends CommonEntityResult {
  type: any;
  format: any;
  data: string;
  daiParams: boolean;
  enabled: boolean;
}

export interface StreamPayload extends CommonEntityPayload {
  type: any;
  format: any;
  data: string;
  enabled: boolean;
  daiParams: boolean;
}

export function makeEmptyStream(): StreamPayload {
  return {
    type: StreamTypesValues[0],
    name: '',
    data: '',
    daiParams: false,
    enabled: false,
    extId: '',
    format: StreamsFormatValues[0],
  };
}
