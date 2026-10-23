import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import Platform from '../../../platform/shared/Platform';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import { PlatformDto } from '../../../shared/dto/PlatformDto';
import Package from '../Package';
import PackageFactory from '../PackageFactory';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const TABLE_NAME = 'test-packageService';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});
const PACKAGE_ID = new UIDGenerator().generate(8);
const FIRST_PLATFORM_ID = new UIDGenerator().generate(8);
const SECOND_PLATFORM_ID = new UIDGenerator().generate(8);
const uid = {
  generate: () => PACKAGE_ID,
};
const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TABLE_NAME, platformMap);
const packageFactory = new PackageFactory(uid, platformRepository);

const packageProps = {
  thumbnail: 'packages/packageid/thumbnail.png',
  default: false,
  description: 'This is a package',
  price: '6.99',
  type: PackageType.INTERNAL,
  revenueModel: RevenueModel.PAID,
  extId: 'reality-package',
  name: 'Reality',
  platforms: [FIRST_PLATFORM_ID, SECOND_PLATFORM_ID],
  weight: 0,
};

const expectedPackage = Package.create({
  thumbnail: 'packages/packageid/thumbnail.png',
  default: false,
  description: 'This is a package',
  price: '6.99',
  type: PackageType.INTERNAL,
  revenueModel: RevenueModel.PAID,
  extId: 'reality-package',
  name: 'Reality',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
  weight: 0,
}, PACKAGE_ID);

const firstPlatformDto: Required<Omit<PlatformDto, 'id'>> = {
  extId: 'reality-platform',
  name: 'Z',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};

const secondPlatformDto: Required<Omit<PlatformDto, 'id'>> = {
  extId: 'reality-platform',
  name: 'A',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};

const firstPlatform = Platform.create(firstPlatformDto, FIRST_PLATFORM_ID);
const secondPlatform = Platform.create(secondPlatformDto, SECOND_PLATFORM_ID);

describe('PackageFactory', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  describe('toDomain', () => {
    it('should throw UnknownPackageDependency error', async () => {
      await expect(async () => packageFactory.toDomain(packageProps)).rejects.toThrow();
    });

    it('should update the thumbnail', async () => {
      const testPackage = Package.create({
        thumbnail: 'packages/packageid/thumbnail.png',
        default: false,
        description: 'This is a package',
        price: '6.99',
        type: PackageType.INTERNAL,
        revenueModel: RevenueModel.PAID,
        extId: 'reality-package',
        name: 'Reality',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
        weight: 1,
      }, PACKAGE_ID);
      testPackage.updateThumbnail('packages/otherpackageid/thumbnail.png');
      expect(testPackage.thumbnail.value()).toEqual('packages/otherpackageid/thumbnail.png');
    });

    it('should create a Package with sorted required members', async () => {
      await platformRepository.save(firstPlatform);
      await platformRepository.save(secondPlatform);
      expectedPackage.addPlatform(secondPlatform);
      expectedPackage.addPlatform(firstPlatform);
      const packageItem = await packageFactory.toDomain(packageProps);
      expect(packageItem).toEqual(expectedPackage);
      expect(packageItem.updatedAt).toEqual(packageItem.createdAt);
    });
  });

  describe('toPersistence', () => {
    it('should return a PackageDto', () => {
      const packageItem = packageFactory.toPersistence(expectedPackage);
      expect(packageItem.id).toEqual(PACKAGE_ID);
      expect(packageItem.platforms).toEqual([SECOND_PLATFORM_ID, FIRST_PLATFORM_ID]);
      expect(packageItem.createdAt).toEqual('2022-10-17T00:00:00.000Z');
    });
  });

  describe('toDomain - sort', () => {
    it('should not sort items is they are equals', async () => {
      const updatedFirstPlatform = Platform.create({ ...firstPlatformDto, name: 'a' }, 'b');
      const updatedSecondPlatform = Platform.create({ ...secondPlatform, name: 'a' }, 'a');
      await platformRepository.save(updatedFirstPlatform);
      await platformRepository.save(updatedSecondPlatform);

      expectedPackage.platforms = [];

      expectedPackage.addPlatform(updatedSecondPlatform); // a first
      expectedPackage.addPlatform(updatedFirstPlatform); // b second

      const packageItem = await packageFactory.toDomain({ ...packageProps, platforms: ['a', 'b'] });

      expect(packageItem).toEqual(expectedPackage);
    });
  });
});
