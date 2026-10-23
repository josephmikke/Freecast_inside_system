import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { PlatformDto } from '../../../shared/dto/PlatformDto';
import Platform from '../Platform';
import PlatformRepository from '../PlatformRepository';
import PlatformMap from '../PlatformMap';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TABLE_NAME = 'test-platformRepository';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});
const platformDto: Required<Omit<PlatformDto, 'id'>> = {
  extId: 'reality-platform',
  name: 'Reality',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};

const uid = new UIDGenerator();
const PLATFORM_ID = uid.generate(8);

const platform = Platform.create(platformDto, PLATFORM_ID);
const platformMap = new PlatformMap(uid);
const repository = new PlatformRepository(ddbClient, TABLE_NAME, platformMap);

describe('Empty database', () => {
  beforeEach(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterEach(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should check if a Platform exists and return false', async () => {
    expect(await repository.exists({
      createdAt: '', extId: '', id: '', name: '', updatedAt: '', enabled: true,
    })).toBeFalsy();
  });

  it('should return all an empty array', async () => {
    expect(await repository.findAll()).toEqual([]);
  });

  it('should return false if not relationships are found', async () => {
    expect(await repository.hasRelationships(platform)).toBeFalsy();
  });
});

describe('Non-Empty database', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
    await repository.save(platform);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  it('should save a new Platform', async () => {
    expect(await repository.save(platform)).toBeTruthy();
  });

  it('should check if a Platform exists and return true', async () => {
    expect(await repository.exists(platform)).toBeTruthy();
  });

  it('should find one item given an id', async () => {
    expect(await repository.findOne(platform.id)).toEqual(platform);
  });

  it('should return true if relationships are found', async () => {
    const items = Array.from(Array(2).keys()).map((_, key) => ({
      PK: `C#${key}`,
      SK: `ASSET#PLATFORM#${PLATFORM_ID}`,
      entityType: 'CHANNEL',
      'GSI1-PK': `ASSET#PLATFORM#${PLATFORM_ID}`,
      'GSI1-SK': `C#${key}`,
    }));
    await repository.batchWriteItem(items);

    expect(await repository.hasRelationships(platform)).toBeTruthy();
  });

  it('should find many items at once', async () => {
    expect(await repository.findMany([PLATFORM_ID])).toEqual([platform]);
  });

  it('should remove an item', async () => {
    expect(await repository.findOne(platform.id)).toBeDefined();

    expect(await repository.remove(platform)).toBeTruthy();

    expect(await repository.findOne(platform.id)).toBeUndefined();
  });

  it('should return all platforms sorted by name', async () => {
    const platforms = await Promise.all(Array.from(Array(20)
      .keys()).map(async (item, key) => {
      const platformEntity = platformMap.toDomain({
        name: `Platform ${key}`,
        extId: `platform-${key}`,
      });
      await repository.save(platformEntity);
      return platformEntity;
    }));
    // Sort array to match repository response order (by name ASC)
    platforms.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    expect(await repository.findAll()).toMatchObject(platforms);
  });
});

describe.each([
  (payload: Platform) => repository.remove(payload),
  (payload: Platform) => repository.save(payload),
  (payload: Platform) => repository.exists(payload),
  (payload: Platform) => repository.hasRelationships(payload),
  (payload: Array<string>) => repository.findMany(payload),
  (id: string) => repository.findOne(id),
  () => repository.findAll(),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
