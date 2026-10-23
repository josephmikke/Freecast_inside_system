import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import Package from '../../../package/shared/Package';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { LocationType } from '../../../shared/dto/LocationDto';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import { LocationDocument } from '../ILocationRepository';
import Location from '../Location';
import LocationFactory from '../LocationFactory';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import LocationRepository from '../LocationRepository';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const TABLE_NAME = 'test-locationRepository';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const uid = new UIDGenerator();
const LOCATION_ID = uid.generate(8);
const LOCATION_PACKAGE_ID = uid.generate(8);

const packageDto = {
  slug: 'location-package-us',
  extId: 'location-package-us',
  type: LocationType.PACKAGE,
  name: 'US',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
};

const locationDto = {
  slug: 'location-zipcode-34000',
  extId: 'location-zipcode-34000',
  type: LocationType.ZIPCODE,
  name: '34000',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
};

const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TABLE_NAME, platformMap);

const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(ddbClient, TABLE_NAME, packageFactory);

const locationFactory = new LocationFactory(uid, packageRepository);
const locationRepository = new LocationRepository(ddbClient, TABLE_NAME, locationFactory);

const locationItem = Location.create(locationDto, LOCATION_ID);
const packageItem = Location.create(packageDto, LOCATION_PACKAGE_ID);
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
locationItem.addAffiliation(packageItem);

describe('Non-Empty database', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should check if a Location exists and return false', async () => {
    expect(await locationRepository.exists(locationItem)).toBeFalsy();
  });

  it('should save a new Location', async () => {
    expect(await locationRepository.save(packageItem)).toBeTruthy();
  });

  it('should return false if not relationships are found', async () => {
    expect(await locationRepository.hasRelationships(locationItem)).toBeFalsy();
  });

  it('should find one item given an id', async () => {
    expect(await locationRepository.save(locationItem)).toBeTruthy();
    const result = await locationRepository.findOne(locationItem.id);
    expect(result?.id).toEqual(locationItem.id);
  });

  it('should find requested categories', async () => {
    const newLocation = Location.create({
      slug: 'location-zipcode-34000',
      extId: 'location-zipcode-34000',
      type: LocationType.ZIPCODE,
      name: '34000',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'locationNewId');
    await expect(await (await locationRepository.findMany([locationItem.id, 'locationNewId'])).length).toEqual(1);
    await locationRepository.save(newLocation);
    await expect(await (await locationRepository.findMany([locationItem.id, 'locationNewId'])).length).toEqual(2);

    await locationRepository.remove(newLocation);
  });

  it('should return undefined', async () => {
    expect(await locationRepository.findOne('does not exist'/* , LocationType.COUNTRY */)).toBeUndefined();
  });

  it('should check if a location exists and return true', async () => {
    expect(await locationRepository.exists(locationItem)).toBeTruthy();
  });

  it('should check if a location exists and return true', async () => {
    expect(await locationRepository.exists(packageItem)).toBeTruthy();
  });

  it('should remove a location and his children', async () => {
    expect(await locationRepository.remove(locationItem)).toBeTruthy();
  });

  it('should return true if relationships are found', async () => {
    const items = Array.from(Array(2).keys()).map((_, key) => ({
      PK: `C#${key}`,
      SK: `ASSET#LOCATION#${locationItem.type}#${LOCATION_ID}`,
      entityType: 'ZIPCODE',
      'GSI1-PK': `ASSET#LOCATION#${locationItem.type}#${LOCATION_ID}`,
      'GSI1-SK': `C#${key}`,
    }));
    await locationRepository.batchWriteItem(items);

    expect(await locationRepository.hasRelationships(locationItem)).toBeTruthy();
  });
});

describe('findAll', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should return all locations sorted by name', async () => {
    const location = Location.create({
      slug: 'location:9',
      extId: 'location:9',
      name: 'Location #9',
      type: LocationType.PACKAGE,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'zzzzzzzzzzzzzzzzzzzzz');
    await locationRepository.save(location);
    const locations = await Promise.all(Array.from(Array(20)
      .keys()).map(async (item) => {
      const locationEntity = await locationFactory.toDomain({
        slug: `location:${item}`,
        extId: `location:${item}`,
        name: `Location #${item}`,
        type: item % 2 === 0 ? LocationType.COUNTRY : LocationType.PACKAGE,
      });
      await locationRepository.save(locationEntity);
      return locationEntity;
    }));
    // Sort array to match repository response order (by name ASC)
    locations.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    expect(await locationRepository.findAll()).toEqual([...locations, location]);
  });
});

describe('findAllByType', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should return all countries locations sorted by name', async () => {
    const locations = await Promise.all(Array.from(Array(20)
      .keys()).map(async (item) => {
      const locationEntity = await locationFactory.toDomain({
        slug: `location:${item}`,
        extId: `location:${item}`,
        name: `Location #${item}`,
        type: LocationType.COUNTRY,
      });
      await locationRepository.save(locationEntity);
      return locationEntity;
    }));
    // Sort array to match repository response order (by name ASC)
    locations.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    expect(await locationRepository.findAllByType(LocationType.COUNTRY)).toEqual(locations);
  });
});

describe.each([
  (payload: Location) => locationRepository.remove(payload),
  (payload: Location) => locationRepository.save(payload),
  (payload: Location) => locationRepository.exists(payload),
  (payload: Location) => locationRepository.hasRelationships(payload),
  (id: string) => locationRepository.findOne(id/* , LocationType.ZIPCODE */),
  () => locationRepository.findAll(),
  // An empty id list never reaches DynamoDB, so pass an id to hit the missing table
  () => locationRepository.findMany([LOCATION_ID]),
  () => locationRepository.findManyByType([LOCATION_PACKAGE_ID], LocationType.PACKAGE),
  () => locationRepository.findAllByType(LocationType.PACKAGE),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});

describe('Relations DynamoDB', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should create locations in database', async () => {
    await locationRepository.save(packageItem);
    await packageRepository.save(packageAffiliation);
    locationItem.addPackage(packageAffiliation);
    await locationRepository.save(locationItem);

    expect(await locationRepository.exists(packageItem)).toBeTruthy();
    expect(await locationRepository.exists(locationItem)).toBeTruthy();

    const { Items } = await locationRepository.query({
      IndexName: 'GSI1',
      KeyConditionExpression: '#PK = :PK',
      ExpressionAttributeNames: {
        '#PK': 'GSI1-PK',
      },
      ExpressionAttributeValues: {
        ':PK': 'ASSET#LOCATION',
      },
    });
    const locationResults = Items as LocationDocument[];
    expect(locationResults?.length).toEqual(2);
    expect(locationResults[0].id).toEqual(packageItem.id);
    expect(locationResults[1].id).toEqual(locationItem.id);
  });

  it('should create relations in database', async () => {
    const { Items } = await locationRepository.query({
      IndexName: 'GSI1',
      KeyConditionExpression: '#PK = :PK and #SK = :SK',
      ExpressionAttributeNames: {
        '#PK': 'GSI1-PK',
        '#SK': 'GSI1-SK',
      },
      ExpressionAttributeValues: {
        ':PK': `ASSET#PACKAGE#${packageAffiliation.id}`,
        ':SK': `ASSET#LOCATION#ZIPCODE#${locationItem.id}`,
      },
    });
    const locationResults = Items as LocationDocument[];
    expect(locationResults?.length).toEqual(1);
    expect(locationResults[0].id).toEqual(packageAffiliation.id);
  });

  it('should delete relations in database', async () => {
    await locationRepository.remove(locationItem);

    const { Items } = await locationRepository.query({
      IndexName: 'GSI1',
      KeyConditionExpression: '#PK = :PK and #SK = :SK',
      ExpressionAttributeNames: {
        '#PK': 'GSI1-PK',
        '#SK': 'GSI1-SK',
      },
      ExpressionAttributeValues: {
        ':PK': `ASSET#LOCATION#PACKAGE#${packageItem.id}`,
        ':SK': `ASSET#LOCATION#ZIPCODE#${locationItem.id}`,
      },
    });
    const locationResults = Items as LocationDocument[];
    expect(locationResults?.length).toEqual(0);
  });
});

describe('multiple affiliation types', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should return main location and related locations', async () => {
    const countryLocation = Location.create({
      slug: 'location-country-us-bis',
      extId: 'location-country-us-bis',
      type: LocationType.COUNTRY,
      name: 'US-BIS',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'countrylocation');
    const stateLocation = Location.create({
      slug: 'location-state-mc',
      extId: 'location-state-mc',
      type: LocationType.STATE,
      name: 'MC',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'statelocation');
    const cityLocation = Location.create({
      slug: 'location-city-ny',
      extId: 'location-city-ny',
      type: LocationType.CITY,
      name: 'NY',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'citylocation');
    const cityLocation1 = Location.create({
      slug: 'location-city-ny1',
      extId: 'location-city-ny1',
      type: LocationType.CITY,
      name: 'NY1',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'citylocation1');
    const cityLocation2 = Location.create({
      slug: 'location-city-ny2',
      extId: 'location-city-ny2',
      type: LocationType.CITY,
      name: 'NY2',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'citylocation2');
    const zipCodeLocation = Location.create({
      slug: 'location-zipcode-ny',
      extId: 'location-zipcode-ny',
      type: LocationType.ZIPCODE,
      name: '27838',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'zipcodelocation');
    const packageLocation = Location.create({
      slug: 'location-package-us',
      extId: 'location-package-us',
      type: LocationType.PACKAGE,
      name: 'US-P',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'packagelocation');

    stateLocation.addAffiliation(countryLocation);
    stateLocation.addAffiliation(cityLocation);
    cityLocation1.addAffiliation(stateLocation);
    cityLocation.addAffiliation(zipCodeLocation);
    zipCodeLocation.addAffiliation(cityLocation2);
    zipCodeLocation.addPackage(packageAffiliation);

    await packageRepository.save(packageAffiliation);
    await locationRepository.save(cityLocation2);
    await locationRepository.save(countryLocation);
    await locationRepository.save(packageLocation);
    await locationRepository.save(zipCodeLocation);
    await locationRepository.save(cityLocation);
    await locationRepository.save(stateLocation);
    await locationRepository.save(cityLocation1);

    const stateLocationItem = await locationRepository.findOne('statelocation');
    const cityLocationItem1 = await locationRepository.findOne('citylocation1');
    const zipCodeLocationItem = await locationRepository.findOne('zipcodelocation');
    expect(stateLocationItem?.countries?.length).toEqual(1);
    expect(cityLocationItem1?.states?.length).toEqual(1);
    expect(zipCodeLocationItem?.cities?.length).toEqual(1);
    expect(zipCodeLocationItem?.packages.length).toEqual(1);
  });

  it('should throw error when dependency is unknown', async () => {
    const mainLocation = Location.create({
      slug: 'location-country-us-2',
      extId: 'location-country-us-2',
      type: LocationType.COUNTRY,
      name: 'US',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'mainlocation2');

    await packageRepository.remove(packageAffiliation);

    mainLocation.addPackage(packageAffiliation);
    await expect(async () => locationRepository.save(mainLocation)).rejects
      .toThrow(Error);
  });
});
