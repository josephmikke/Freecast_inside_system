export enum StreamType {
  EMBED_CODE = 'EMBED_CODE',
  STREAM = 'STREAM',
  SOURCE_URL = 'SOURCE_URL',
  VIDILLION = 'VIDILLION',
}

export enum StreamFormat {
  HLS = 'HLS',
  DASH = 'DASH',
  HLS_DRM = 'HLS_DRM',
  DASH_DRM = 'DASH_DRM',
}

export interface StreamProps {
  id?: string;
  name: string;
  extId?: string;
  type: StreamType;
  format: StreamFormat;
  data: string;
  daiParams: boolean;
  weight?: number;
  enabled?: boolean;
}

export interface StreamRequestDto extends StreamProps {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
}

export interface StreamDto extends StreamProps {
  id: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
}
