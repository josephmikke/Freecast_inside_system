import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import Package from '../../../package/shared/Package';
import { PackageError } from '../../../package/shared/PackageError';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { LocationType } from '../../../shared/dto/LocationDto';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import Location from '../Location';
import LocationFactory from '../LocationFactory';
import LocationRepository from '../LocationRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const TABLE_NAME = 'test-locationService';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});
const LOCATION_ID = new UIDGenerator().generate(8);
const COUNTRY_LOCATION_ID = new UIDGenerator().generate(8);
const uid = {
  generate: () => COUNTRY_LOCATION_ID,
};

const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TABLE_NAME, platformMap);

const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(ddbClient, TABLE_NAME, packageFactory);

const locationFactory = new LocationFactory(uid, packageRepository);
const locationRepository = new LocationRepository(ddbClient, TABLE_NAME, locationFactory);

const expectedLocation = Location.create({
  slug: 'location-package-us',
  extId: 'location-package-us',
  type: LocationType.PACKAGE,
  name: 'US',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
}, LOCATION_ID);

const countryLocationProp = {
  slug: 'location-country-us',
  extId: 'location-country-us',
  type: LocationType.COUNTRY,
  name: 'United States',
  enabled: true,
};

const countryLocation = Location.create({
  slug: 'location-country-us',
  extId: 'location-country-us',
  type: LocationType.COUNTRY,
  name: 'United States',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
}, COUNTRY_LOCATION_ID);

const sameLocation1 = Location.create({
  slug: 'location-package-us',
  extId: 'location-package-us',
  type: LocationType.PACKAGE,
  name: 'US',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
}, LOCATION_ID);

const sameLocationProp = {
  slug: 'location-country-us',
  extId: 'location-country-us',
  type: LocationType.STATE,
  name: 'US',
};

const sameLocation2 = Location.create({
  slug: 'location-country-us',
  extId: 'location-country-us',
  type: LocationType.STATE,
  name: 'US',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
}, COUNTRY_LOCATION_ID);

const packageAffiliation = Package.create({
  extId: 'location-package-wu',
  name: 'Western Union',
  description: 'description',
  type: PackageType.INTERNAL,
  price: 'free',
  revenueModel: RevenueModel.FREE,
  default: true,
  thumbnail: 'package/packageid/thumbnail.png',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
  weight: 0,
}, 'first-package-entity');

describe('LocationFactory', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  describe('toDomain', () => {
    it('should throw package unknown error', async () => {
      await expect(async () => locationFactory.toDomain({
        ...countryLocationProp,
        packages: [packageAffiliation.id],
      }))
        .rejects.toThrow(PackageError.UnknownPackageDependency);
    });

    it('should create a Package with sorted required members', async () => {
      await locationRepository.save(countryLocation);
      await locationRepository.save(expectedLocation);
      countryLocation.addAffiliation(expectedLocation);

      const locationItem = await locationFactory.toDomain(countryLocationProp);
      expect(locationItem.id).toEqual(countryLocation.id);
      expect(locationItem.updatedAt).toEqual(locationItem.createdAt);
    });
  });

  describe('toPersistence', () => {
    it('should return a LocationDto', () => {
      // COUNTRY
      expectedLocation.addAffiliation(countryLocation);

      // STATE
      const stateLocation = Location.create({
        slug: 'location-state-ny',
        extId: 'location-state-ny',
        type: LocationType.STATE,
        name: 'NY',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      expectedLocation.addAffiliation(stateLocation);

      // ZIPCODE
      const zipCodeLocation = Location.create({
        slug: 'location-zipCode-ny',
        extId: 'location-zipCode-ny',
        type: LocationType.ZIPCODE,
        name: 'NY',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      expectedLocation.addAffiliation(zipCodeLocation);

      // CITY
      const cityLocation = Location.create({
        slug: 'location-city-ny',
        extId: 'location-city-ny',
        type: LocationType.CITY,
        name: 'NY',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      const cityLocation1 = Location.create({
        slug: 'location-city-ny1',
        extId: 'location-city-ny1',
        type: LocationType.CITY,
        name: 'NY1',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
      }, new UIDGenerator().generate(8));
      expectedLocation.addAffiliation(cityLocation);

      cityLocation.addAffiliation(stateLocation);
      cityLocation.addAffiliation(zipCodeLocation);
      zipCodeLocation.addAffiliation(cityLocation1);
      stateLocation.addAffiliation(countryLocation);
      stateLocation.addAffiliation(cityLocation);
      stateLocation.addAffiliation(expectedLocation);
      stateLocation.addPackage(packageAffiliation);

      // PACKAGE
      expectedLocation.addAffiliation(sameLocation1);

      const packageItem = locationFactory.toPersistence(expectedLocation);
      expect(packageItem.id).toEqual(LOCATION_ID);
      expect(packageItem.createdAt).toEqual('2022-10-17T00:00:00.000Z');

      // check country persistence
      const stateItem = locationFactory.toPersistence(stateLocation);
      expect(stateItem.countries?.length).toEqual(1);
      expect(stateItem.countries ? stateItem.countries[0] : null).toEqual(countryLocation.id);

      // check state persistence
      const cityItem = locationFactory.toPersistence(cityLocation);
      expect(cityItem.states?.length).toEqual(1);
      expect(cityItem.states ? cityItem.states[0] : null).toEqual(stateLocation.id);

      // check city persistence
      const zipCodeItem = locationFactory.toPersistence(zipCodeLocation);
      expect(zipCodeItem.cities?.length).toEqual(1);
      expect(zipCodeItem.cities ? zipCodeItem.cities[0] : null).toEqual(cityLocation1.id);

      // check package persistence
      expect(stateItem.packages?.length).toEqual(1);
      expect(stateItem.packages ? stateItem.packages[0] : null).toEqual(packageAffiliation.id);
    });
  });

  describe('toDomain - sort', () => {
    it('should not sort items is they are equals', async () => {
      await locationRepository.save(sameLocation1);
      await locationRepository.save(sameLocation2);

      sameLocation1.addAffiliation(sameLocation2);

      const locationItem = await locationFactory.toDomain(sameLocationProp);

      expect(locationItem.id).toEqual(countryLocation.id);
    });
  });
});
