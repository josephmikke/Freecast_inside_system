import { Event } from '@middy/http-json-body-parser';

export enum PackageType {
  INTERNAL = 'INTERNAL',
  EXTERNAL = 'EXTERNAL',
}

export enum RevenueModel {
  FREE = 'FREE',
  PAID = 'PAID',
}

export type PackageRequestDto = {
  name: string;
  extId: string;
  description: string;
  price: string;
  type: PackageType;
  revenueModel: RevenueModel;
  default: boolean;
  thumbnail: string;
  platforms?: Array<string>
  // geoIpRules?: Array<string> GeoIPRule // TODO: add geoIPRule relationships
};

export type PackageDto = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  // content?: Array<Channel>
  enabled?: boolean;
  weight: number;
} & PackageRequestDto;

export type GetPackagesEvent = {
} & Event;

export type UpdatePackageEvent = {
  body: Partial<PackageRequestDto>
  pathParameters: {
    id: string;
  }
} & Event;

export type UpdatePackageWeightEvent = {
  pathParameters: {
    id: string;
    index: string;
  }
} & Event;

export type DeletePackageEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type AddPackageEvent = {
  body: PackageRequestDto
} & Event;
