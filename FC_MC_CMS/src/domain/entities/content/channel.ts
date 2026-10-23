import { CommonEntityResult, ThumbnailResult } from '@entities/common';
import { ProviderResult } from '@entities/configurations/provider';
import { EPGResult } from '@entities/content/epg';
import { PlatformResult } from '@entities/configurations/platform';
import { CategoryResult } from '@entities/configurations/category';
import { PackageResult } from '@entities/configurations/package';
import { GenreResult } from '@entities/configurations/genre';
import { LocationResult } from '@entities/configurations/location';
import { DistributorResult } from '@entities/content/distributor';
import { BrandResult } from '@entities/content/brand';
import { StreamPayload, StreamResult } from '@entities/content/stream';

interface ChannelEPGProgramResult {
  id: string;
  subtitle: string;
  program_thumbnail: string;
  program_alt_thumbnail: string;
  catchup: boolean;
  description: string;
  duration: string;
  end_time: string;
  ext_id: string;
  slug: string;
  start_time: string;
  title: string;
}

interface ChannelResult extends CommonEntityResult {
  slug: string;
  lcn: number;
  vastId: string;
  rating: string;
  description: string;
  visible: boolean;
  catchUpActive: boolean;
  availableDate: string;
  expirationDate: string;
  mediapackageId: string;
  thumbnail: ThumbnailResult;
  provider: ProviderResult;
  epg: EPGResult;
  platforms: PlatformResult[];
  categories: CategoryResult[];
  packages: PackageResult[];
  genres: GenreResult[];
  locations: LocationResult[];
  streams: StreamResult[] | StreamPayload[];
  distributors: DistributorResult[];
  brands: BrandResult[];
}

export type { ChannelResult, ChannelEPGProgramResult };
