import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import Package from '../../../package/shared/Package';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { PackageError } from '../../../package/shared/PackageError';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { LocationType } from '../../../shared/dto/LocationDto';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Location from '../../shared/Location';
import { LocationError } from '../../shared/LocationError';
import LocationFactory from '../../shared/LocationFactory';
import LocationRepository from '../../shared/LocationRepository';
import UpdateLocationDomain from '../UpdateLocationDomain';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const TEST_TABLE_NAME = 'test-updateLocationDomain';

const uid = new UIDGenerator();

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}
const logTracker = new MockLogTracker();

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TEST_TABLE_NAME, platformMap);

const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);

const locationFactory = new LocationFactory(uid, packageRepository);
const locationRepository = new LocationRepository(
  ddbClient,
  TEST_TABLE_NAME,
  locationFactory,
);
const domain = new UpdateLocationDomain(locationRepository, locationFactory, logTracker);

const firstPackageAffiliation = Package.create({
  extId: 'firetv',
  name: 'FireTV',
  description: 'description',
  type: PackageType.INTERNAL,
  price: 'free',
  revenueModel: RevenueModel.FREE,
  default: true,
  thumbnail: 'package/packageid/thumbnail.png',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
  weight: 0,
}, 'first-package-entity');

const secondPackageAffiliation = Package.create({
  extId: 'tv-OS',
  name: 'tvOS',
  description: 'description',
  type: PackageType.INTERNAL,
  price: 'free',
  revenueModel: RevenueModel.FREE,
  default: true,
  thumbnail: 'package/packageid/thumbnail.png',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
  weight: 1,
}, 'second-package-entity');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-11-30'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('UpdateLocationDomain', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    await packageRepository.save(firstPackageAffiliation);
    await packageRepository.save(secondPackageAffiliation);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe('updateLocation', () => {
    const locationItem = Location.create({
      slug: 'zipcode-location',
      extId: 'zipcode-location',
      name: 'zipcode',
      type: LocationType.ZIPCODE,
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      enabled: true,
    }, '1');
    locationItem.addPackage(firstPackageAffiliation);

    const existingLocation = Location.create({
      slug: 'new-location',
      extId: 'new-location',
      name: 'zipcode',
      type: LocationType.ZIPCODE,
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      enabled: true,
    }, '2');

    it('should throw Location Not Found', async () => {
      await expect(async () => domain.updateLocation('1', {
        name: 'Brand new Name',
      })).rejects.toThrow(LocationError.LocationNotFound);
    });

    it('should update a Location name with correct updatedAt time and two packages', async () => {
      await locationRepository.save(locationItem);

      expect(await domain.updateLocation('1', {
        name: 'Brand new Name',
        packages: ['first-package-entity', 'second-package-entity'],
      })).toBeTruthy();

      const result = await locationRepository.findOne('1');

      expect(result).toEqual({
        ...locationItem,
        packages: [firstPackageAffiliation, secondPackageAffiliation],
        updatedAt: '2022-11-30T00:00:00.000Z', // Should be the value as jest.setSystemTime()
        name: 'Brand new Name',

      });
    });

    it('should update a Location and remove missing packages', async () => {
      expect(await domain.updateLocation('1', {
        packages: ['second-package-entity'],
      })).toBeTruthy();

      expect(await locationRepository.findOne('1')).toEqual({
        ...locationItem,
        packages: [secondPackageAffiliation],
        updatedAt: '2022-11-30T00:00:00.000Z', // Should be the value as jest.setSystemTime()
        name: 'Brand new Name',
      });
    });

    it('should update a enabled status', async () => {
      expect(await domain.updateLocation('1', {
        enabled: false,
      })).toBeTruthy();

      expect((await locationRepository.findOne('1'))?.enabled).toBeFalsy();
      await domain.updateLocation('1', {
        enabled: true,
      });
    });

    it('should update a Location and remove previous package affiliations', async () => {
      expect(await domain.updateLocation('1', {
        packages: [],
      })).toBeTruthy();

      expect(await locationRepository.findOne('1')).toEqual({
        ...locationItem,
        packages: [],
        updatedAt: '2022-11-30T00:00:00.000Z', // Should be the value as jest.setSystemTime()
        name: 'Brand new Name',
      });
    });

    it('should throw an error if extId already exist on another Location', async () => {
      await locationRepository.save(existingLocation);

      await expect(async () => domain.updateLocation('1', {
        slug: 'new-location', // This id already exist in db
      })).rejects.toThrow(LocationError.LocationAlreadyExist);

      expect(await locationRepository.findOne('2')).toEqual(existingLocation);
    });

    it('should throw an error if dependency does not exist', async () => {
      await locationRepository.save(existingLocation);

      await expect(async () => domain.updateLocation('1', {
        packages: ['lol'],
      })).rejects.toThrow(PackageError.UnknownPackageDependency);

      expect(await locationRepository.findOne('2')).toEqual(existingLocation);
    });

    it('should update a Location extId and name', async () => {
      expect(await domain.updateLocation('1', {
        name: 'Again a new name',
        slug: 'local:1', // This id doesn't exist in db
        extId: 'local:1', // This id doesn't exist in db
        packages: ['second-package-entity'],
        enabled: false,
      })).toBeTruthy();

      expect(await locationRepository.findOne('1')).toEqual({
        ...locationItem,
        packages: [secondPackageAffiliation],
        name: 'Again a new name',
        slug: 'local:1',
        extId: 'local:1',
        updatedAt: '2022-11-30T00:00:00.000Z',
        enabled: false,
      });
    });
  });
});
