import { Event } from '@middy/http-json-body-parser';

export enum LocationType {
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
  CITY = 'CITY',
  ZIPCODE = 'ZIPCODE',
  PACKAGE = 'PACKAGE',
}

/*
 * About ZIPCODE locations:
 * UI Zip Code field reference to property "name"
 */
export type LocationRequestDto = {
  name: string,
  extId?: string,
  slug: string,
  type: LocationType,
  countries?: Array<string>,
  states?: Array<string>,
  cities?: Array<string>,
  zipCodes?: Array<string>,
  packages?: Array<string>,
  enabled?: boolean;
};

export type LocationDto = {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
} & LocationRequestDto;

export type PersistentLocationDto = {
  id: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
} & LocationRequestDto;

export type GetLocationsEvent = {
} & Event;

export type UpdateLocationEvent = {
  body: Partial<LocationRequestDto>
  pathParameters: {
    id: string;
  }
} & Event;

export type DeleteLocationEvent = {
  pathParameters: {
    id: string;
  }
} & Event;

export type AddLocationEvent = {
  body: LocationRequestDto
} & Event;
