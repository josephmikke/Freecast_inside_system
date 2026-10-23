interface CommonEntityResult {
  id: string;
  extId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
}

interface CommonEntityPayload {
  name: string;
  extId: string;
}

type ThumbnailResult = string;
type ThumbnailPayload = string;

export type {
  CommonEntityResult,
  CommonEntityPayload,
  ThumbnailResult,
  ThumbnailPayload,
};
