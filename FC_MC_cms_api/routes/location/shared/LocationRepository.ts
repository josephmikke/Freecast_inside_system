import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import Location from './Location';

import {
  LocationDto, LocationRequestDto, LocationType, PersistentLocationDto,
} from '../../shared/dto/LocationDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { IFactory } from '../../shared/interfaces/IFactory';

import { ILocationRepository, LocationDocument } from './ILocationRepository';
import { LocationError } from './LocationError';
import LocationFactory from './LocationFactory';

const rootEntityType = 'LOCATION';

export default class LocationRepository extends BaseRepository implements ILocationRepository {
  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly locationFactory: IFactory<
    Location, LocationRequestDto, PersistentLocationDto
    >,
  ) {
    super(client, tableName);
  }

  private sortByName = (a: LocationDocument, b: LocationDocument) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  };

  private getAffiliationDocuments(
    item: Location,
    affiliationType: LocationType,
    onlyPrimary?: boolean,
  ) {
    if (onlyPrimary) {
      return Array.from(item.getAffiliations(affiliationType)).map((location) => ({
        PK: `ASSET#LOCATION#${item.type}#${item.id}`,
        SK: `ASSET#LOCATION#${affiliationType}#${location.id}`,
      }));
    }
    return Array.from(item.getAffiliations(affiliationType)).map((location) => ({
      id: location.id,
      PK: `ASSET#LOCATION#${item.type}#${item.id}`,
      SK: `ASSET#LOCATION#${affiliationType}#${location.id}`,
      'GSI1-PK': `ASSET#LOCATION#${affiliationType}#${location.id}`,
      'GSI1-SK': `ASSET#LOCATION#${item.type}#${item.id}`,
      entityType: rootEntityType,
    }));
  }

  private getPackageDocuments(
    item: Location,
    onlyPrimary?: boolean,
  ) {
    if (onlyPrimary) {
      return Array.from(item.packages).map((packageItem) => ({
        PK: `ASSET#LOCATION#${item.type}#${item.id}`,
        SK: `ASSET#PACKAGE#${packageItem.id}`,
      }));
    }
    return Array.from(item.packages).map((packageItem) => ({
      id: packageItem.id,
      PK: `ASSET#LOCATION#${item.type}#${item.id}`,
      SK: `ASSET#PACKAGE#${packageItem.id}`,
      'GSI1-PK': `ASSET#PACKAGE#${packageItem.id}`,
      'GSI1-SK': `ASSET#LOCATION#${item.type}#${item.id}`,
      entityType: rootEntityType,
    }));
  }

  async findMany(ids: Array<string>): Promise<Array<Location>> {
    try {
      const countries = await this.findManyByType(ids, LocationType.COUNTRY);
      const states = await this.findManyByType(ids, LocationType.STATE);
      const cities = await this.findManyByType(ids, LocationType.CITY);
      const zipCode = await this.findManyByType(ids, LocationType.ZIPCODE);
      const packages = await this.findManyByType(ids, LocationType.PACKAGE);

      return countries.concat(states, cities, zipCode, packages);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findManyByType(ids: Array<string>, type: LocationType): Promise<Array<Location>> {
    try {
      const items = await this.batchGetItem(ids.map((id) => ({
        PK: `ASSET#${rootEntityType}#${type}#${id}`,
        SK: `ASSET#${rootEntityType}#${type}#${id}`,
      })));
      return await Promise.all((items as LocationDocument[])?.map(
        async (location) => {
          const locationItem = await this.updateAffiliations(
            await this.locationFactory.toDomain(location as Required<LocationDocument>),
            location as LocationDto,
          );

          return this.getAffiliations(locationItem);
        },
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async hasRelationships(item: Location): Promise<any> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${rootEntityType}#${item.type}#${item.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(item: Location): Promise<boolean> {
    try {
      const locationItem = this.locationFactory.toPersistence(item);
      const rootDocument = {
        PK: `ASSET#${rootEntityType}#${locationItem.type}#${locationItem.id}`,
        SK: `ASSET#${rootEntityType}#${locationItem.type}#${locationItem.id}`,
      };

      const docs = [
        ...this.getAffiliationDocuments(item, LocationType.COUNTRY, true),
        ...this.getAffiliationDocuments(item, LocationType.STATE, true),
        ...this.getAffiliationDocuments(item, LocationType.CITY, true),
        ...this.getAffiliationDocuments(item, LocationType.ZIPCODE, true),
        ...this.getPackageDocuments(item, true),
        rootDocument,
      ];
      return !!await this.batchDeleteDocuments(docs);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(item: Location): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        FilterExpression: '#slug = :slug',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#slug': 'searchSlug',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${rootEntityType}`,
          ':slug': item.slug.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findAll() {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${rootEntityType}`,
        },
      });
      return await Promise.all((Items as Required<LocationDocument>[])?.sort(this.sortByName).map(
        async (item: Required<LocationDocument>) => this.updateAffiliations(
          await this.locationFactory.toDomain(item),
          item,
        ),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findAllByType(type: LocationType) {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK and begins_with(#SK, :SK)',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#SK': 'GSI1-SK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${rootEntityType}`,
          ':SK': `ASSET#${rootEntityType}#${type}#`,
        },
      });
      return await Promise.all((Items as Required<LocationDocument>[])?.sort(this.sortByName).map(
        async (item: Required<LocationDocument>) => this.updateAffiliations(
          await this.locationFactory.toDomain(item),
          item,
        ),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  private async checkDependencies(expectedLocation: Location) {
    const realLocation = await this.getAffiliations(expectedLocation);

    if (
      realLocation.countries?.length !== expectedLocation.countries?.length
      || realLocation.states?.length !== expectedLocation.states?.length
      || realLocation.cities?.length !== expectedLocation.cities?.length
      || realLocation.zipCodes?.length !== expectedLocation.zipCodes?.length
      || realLocation.packages.length !== expectedLocation.packages.length
    ) {
      throw new LocationError.UnknownLocationDependency();
    }
  }

  async save(item: Location): Promise<boolean> {
    try {
      const locationItem = this.locationFactory.toPersistence(item);
      const locationDocument: LocationDocument = {
        PK: `ASSET#${rootEntityType}#${item.type}#${item.id}`,
        SK: `ASSET#${rootEntityType}#${item.type}#${item.id}`,
        'GSI1-PK': `ASSET#${rootEntityType}`,
        'GSI1-SK': `ASSET#${rootEntityType}#${item.type}#${item.id}`,
        entityType: `${rootEntityType}`,
        searchName: item.name.toLowerCase(),
        searchSlug: item.slug.toLowerCase(),
        ...locationItem,
      };
      await this.checkDependencies(item);
      const docs = [
        ...this.getAffiliationDocuments(item, LocationType.COUNTRY),
        ...this.getAffiliationDocuments(item, LocationType.STATE),
        ...this.getAffiliationDocuments(item, LocationType.CITY),
        ...this.getAffiliationDocuments(item, LocationType.ZIPCODE),
        ...this.getPackageDocuments(item),
        locationDocument,
      ];
      await this.batchWriteItem(docs);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  private static getRootEntity(id: string, items: Record<string, any>[]) {
    const [locationItem] = items.filter((item) => item.SK === `ASSET#${rootEntityType}#${item.type}#${id}`);
    return locationItem as LocationDocument;
  }

  public async updateAffiliations(
    location: Location,
    affiliations: Partial<LocationRequestDto>,
  ) {
    const updatedLocation = location;

    updatedLocation.countries = await affiliations.countries && affiliations.countries?.length
      ? await this.findManyByType(affiliations.countries, LocationType.COUNTRY)
      : location.countries;
    updatedLocation.states = await affiliations.states && affiliations.states?.length
      ? await this.findManyByType(affiliations.states, LocationType.STATE)
      : location.states;
    updatedLocation.cities = await affiliations.cities && affiliations.cities?.length
      ? await this.findManyByType(affiliations.cities, LocationType.CITY)
      : location.cities;
    updatedLocation.zipCodes = await affiliations.zipCodes && affiliations.zipCodes?.length
      ? await this.findManyByType(affiliations.zipCodes, LocationType.ZIPCODE)
      : location.zipCodes;

    return updatedLocation.sortAffiliations();
  }

  private async getAffiliations(location: Location): Promise<Location> {
    const locationDto = this.locationFactory.toPersistence(location);
    const countries = locationDto.countries?.length
      ? await this.findManyByType(locationDto.countries, LocationType.COUNTRY) : [];
    const states = locationDto.states?.length
      ? await this.findManyByType(locationDto.states, LocationType.STATE) : [];
    const cities = locationDto.cities?.length
      ? await this.findManyByType(locationDto.cities, LocationType.CITY) : [];
    const zipCodes = locationDto.zipCodes?.length
      ? await this.findManyByType(locationDto.zipCodes, LocationType.ZIPCODE) : [];
    const packages = locationDto.packages?.length
      ? await (this.locationFactory as LocationFactory).getPackages(locationDto.packages) : [];

    const newLocation = Location.create({
      slug: location.slug,
      extId: location.extId,
      name: location.name,
      type: location.type,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
      enabled: location.enabled,
    }, location.id);

    countries.map((country) => newLocation.addAffiliation(country));
    states.map((state) => newLocation.addAffiliation(state));
    cities.map((city) => newLocation.addAffiliation(city));
    zipCodes.map((zipCode) => newLocation.addAffiliation(zipCode));
    packages?.map((packageItem) => newLocation.addPackage(packageItem));

    return newLocation.sortAffiliations();
  }

  static async checkDependenciesDto(
    locationRepository: ILocationRepository,
    idList: Array<string> | undefined,
    type: LocationType,
  ) {
    if (idList?.length) {
      const packages = await locationRepository.findManyByType(
        idList,
        type,
      );

      if (idList.length !== packages.length) {
        throw new LocationError.UnknownLocationDependency();
      }
    }
  }

  async findOne(id: string): Promise<Location | undefined> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        FilterExpression: '#id = :id',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#id': 'id',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${rootEntityType}`,
          ':id': id,
        },
      });
      if (!Items?.length) return undefined;
      const locationItem = LocationRepository.getRootEntity(id, Items);
      const location = await this.updateAffiliations(
        await this.locationFactory.toDomain(locationItem as Required<LocationDocument>),
        locationItem as LocationDto,
      );

      return await this.getAffiliations(location);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
