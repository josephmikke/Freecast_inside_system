import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import Platform from '../../../platform/shared/Platform';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import { PlatformDto } from '../../../shared/dto/PlatformDto';
import Package from '../Package';
import PackageRepository from '../PackageRepository';
import PackageFactory from '../PackageFactory';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TABLE_NAME = 'test-packageRepository';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const packageDto = {
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
};

const platformDto: Required<Omit<PlatformDto, 'id'>> = {
  extId: 'reality-platform',
  name: 'Reality',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};

const uid = new UIDGenerator();
const PACKAGE_ID = uid.generate(8);
const PLATFORM_ID = uid.generate(8);
const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TABLE_NAME, platformMap);

const platform = Platform.create(platformDto, PLATFORM_ID);
const packageItem = Package.create(packageDto, PACKAGE_ID);
packageItem.addPlatform(platform);

const packageFactory = new PackageFactory(uid, platformRepository);
const repository = new PackageRepository(ddbClient, TABLE_NAME, packageFactory);

describe('Non-Empty database', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should check if a Package exists and return false', async () => {
    expect(await repository.exists(packageItem)).toBeFalsy();
  });

  it('should save a new Package', async () => {
    expect(await repository.save(packageItem)).toBeTruthy();
  });

  it('should return false if not relationships are found', async () => {
    expect(await repository.hasRelationships(packageItem)).toBeFalsy();
  });

  it('should find one item given an id', async () => {
    await platformRepository.save(platform);
    const result = await repository.findOne(packageItem.id);
    expect(result).toEqual(packageItem);
  });

  it('should return undefined', async () => {
    expect(await repository.findOne('does not exist')).toBeUndefined();
  });

  it('should check if a Package exists and return true', async () => {
    expect(await repository.exists(packageItem)).toBeTruthy();
  });

  it('should remove a package and his children', async () => {
    expect(await repository.remove(packageItem)).toBeTruthy();
  });

  it('should return true if relationships are found', async () => {
    const items = Array.from(Array(2).keys()).map((_, key) => ({
      PK: `C#${key}`,
      SK: `ASSET#PACKAGE#${PACKAGE_ID}`,
      entityType: 'CHANNEL',
      'GSI1-PK': `ASSET#PACKAGE#${PACKAGE_ID}`,
      'GSI1-SK': `C#${key}`,
    }));
    await repository.batchWriteItem(items);

    expect(await repository.hasRelationships(packageItem)).toBeTruthy();
  });
});

describe('findAll', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
    await platformRepository.save(platform);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should return all packages sorted by name', async () => {
    const packages = await Promise.all(Array.from(Array(20)
      .keys()).map(async (item, key) => {
        const packageEntity = await packageFactory.toDomain({
          default: false,
          thumbnail: 'packages/packageid/thumbnail.png',
          description: 'This is a package',
          extId: `package:${item}`,
          name: `Package #${item}`,
          price: '6.99',
          type: PackageType.EXTERNAL,
          revenueModel: RevenueModel.FREE,
          platforms: [platform.id],
          weight: key,
        });
        await repository.save(packageEntity);
        return packageEntity;
      }));
    expect(await repository.findAll()).toEqual(packages);
  });
});

describe.each([
  (payload: Package) => repository.remove(payload),
  (payload: Package) => repository.save(payload),
  (payload: Package) => repository.exists(payload),
  (payload: Package) => repository.hasRelationships(payload),
  (id: string) => repository.findOne(id),
  () => repository.findAll(),
  // An empty id list never reaches DynamoDB, so pass an id to hit the missing table
  () => repository.findMany([PACKAGE_ID]),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
