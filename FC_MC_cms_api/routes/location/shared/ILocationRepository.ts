import { LocationRequestDto, LocationType } from 'routes/shared/dto/LocationDto';
import { BaseDocument } from 'routes/shared/interfaces/BaseDocument';

import Location from './Location';

type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] };

export interface LocationDocument extends WithRequired<LocationRequestDto, 'enabled'>, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  searchName: string;
  searchSlug: string;
}
export interface ILocationRepository {
  findAll(): Promise<Array<Location>>
  findAllByType(type: LocationType): Promise<Array<Location>>
  findMany(ids: Array<string>): Promise<Array<Location>>
  findManyByType(ids: Array<string>, type: LocationType): Promise<Array<Location>>
  findOne(id: string): Promise<Location | undefined>
  hasRelationships(item: Location): Promise<boolean>
  remove(item: Location): Promise<boolean>
  save(item: Location): Promise<boolean>
  exists(item: Location): Promise<boolean>
  updateAffiliations(
    location: Location,
    affiliations: Partial<LocationRequestDto>
  ): Promise<Location>
}
