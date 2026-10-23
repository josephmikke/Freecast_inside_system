import { CommonEntityPayload, CommonEntityResult } from '@entities/common';
import { PackageResult } from '@entities/configurations/package';
import { StringOrValueLabel } from '@components/configurations/misc';

export type LocationType = 'COUNTRY' | 'STATE' | 'CITY' | 'ZIPCODE' | 'PACKAGE';

interface LocationResult extends CommonEntityResult {
  type: LocationType;
  cities?: LocationResult[];
  states?: LocationResult[];
  countries?: LocationResult[];
  zipCodes?: LocationResult[];
  packages: PackageResult[] | StringOrValueLabel[];
  slug: string;
  createdAt: string;
  updatedAt: string;
}

interface LocationPayload extends CommonEntityPayload {
  type: LocationType;
  cities?: string[];
  states?: string[];
  countries?: string[];
  zipCodes?: string[];
  packages?: string[];
  slug: string;
}

export type { LocationResult, LocationPayload };
