import { CommonEntityPayload, CommonEntityResult, ThumbnailResult } from '@entities/common';
import { ProviderResult } from '@entities/configurations/provider';
import { PackageResult } from '@entities/configurations/package';
import { BrandResult } from '@entities/content/brand';
import { CategoryResult } from '@entities/configurations/category';
import { PlatformResult } from '@entities/configurations/platform';
import { DistributorResult } from '@entities/content/distributor';
import { LocationResult } from '@entities/configurations/location';
import { StreamPayload, StreamResult } from '@entities/content/stream';
import { GenreResult } from '@entities/configurations/genre';

export interface EpisodeResult extends CommonEntityResult {
  type: 'EPISODE';
  seriesId: string;
  name: string;
  slug: string;
  season: string;
  number: number;
  duration: string;
  rating: string;
  description: string;
  originalAirDate: string;
  availableDate: string;
  expirationDate: string;
  contentData: string;
  cast: string;
  isIngest: boolean;
  thumbnail: string;
  alternateThumbnail: string;
  streams: StreamResult[];
}

export interface Season {
  seasonNumber: string;
  episodes: EpisodeResult[];
}

export interface VodResult extends CommonEntityResult {
  thumbnail: ThumbnailResult;
  alternateThumbnail?: ThumbnailResult;
  backgroundThumbnail: ThumbnailResult;
  slug: string;
  provider: ProviderResult;
  description: string;
  packages: PackageResult[];
  brands: BrandResult[];
  genres: GenreResult[];
  tmdbId: string;
  imdbId: string;
  availableDate: string;
  releaseYear: string;
  rating: string;
  episodes: EpisodeResult[];
  categories?: CategoryResult[];
  expirationDate: string;
  platforms: PlatformResult[];
  distributors: DistributorResult[];
  locations: LocationResult[];
  contentData: string;
  streams: StreamResult[] | StreamPayload[];

}

export interface VodPayload extends CommonEntityPayload {}
