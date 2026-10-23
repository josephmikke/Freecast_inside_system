export enum StreamFormat {
  HLS = 'HLS',
  DASH = 'DASH',
  HLS_ENCRYPTED = 'HLS_ENCRYPTED',
  DASH_ENCRYPTED = 'DASH_ENCRYPTED',
}

export enum StreamType {
  EMBED_CODE = 'EMBED_CODE',
  STREAM = 'STREAM',
  SOURCE_URL = 'SOURCE_URL',
  VIDILLION = 'VIDILLION',
}

export type MediaDto = {
  id?: string;
  name: string;
  streamFormat: StreamFormat;
  streamType: StreamType;
  data: string;
  active: boolean;
  dai: boolean;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
};
