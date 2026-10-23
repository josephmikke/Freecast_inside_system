import {
  ThumbnailResult, ThumbnailPayload, CommonEntityResult, CommonEntityPayload,
} from '@entities/common';
import { PlatformResult } from '@entities/configurations/platform';

export type PackageType = 'INTERNAL' | 'EXTERNAL';
export type PackageRevenueModel = 'FREE' | 'PAID';

interface PackageResult extends CommonEntityResult {
  type: PackageType;
  description: string;
  price: string;
  default: boolean;
  revenueModel: PackageRevenueModel;
  platforms: PlatformResult[];
  thumbnail: ThumbnailResult;
}

interface PackagePayload extends CommonEntityPayload {
  type: PackageType;
  description: string;
  price: string;
  default: boolean;
  revenueModel: PackageRevenueModel;
  platforms: string[];
  thumbnail: ThumbnailPayload | File[];
}

export type { PackageResult, PackagePayload };
