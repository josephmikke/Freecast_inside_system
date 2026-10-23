import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import Stream from '../Stream';
import StreamFactory from '../StreamFactory';
import StreamRepository from '../StreamRepository';
import { StreamFormat, StreamType } from '../../../shared/dto/StreamDto';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const TEST_TABLE_NAME = 'test-streamRepository';

const uid = new UIDGenerator();

const streamFactory = new StreamFactory(uid);
const streamRepository = new StreamRepository(
  ddbClient,
  TEST_TABLE_NAME,
  streamFactory,
);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const streamDto = {
  extId: 'provider-extId',
  name: 'Provider Reelz_SD',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  type: StreamType.STREAM,
  format: StreamFormat.HLS,
  daiParams: true,
  weight: 1,
  data: 'my-stream-data',
  enabled: true,
};

describe('StreamRepository - Empty database', () => {
  const stream = Stream.create({
    ...streamDto,
    createdAt: '2022-10-17T00:00:00.000Z',
    updatedAt: '2022-10-17T00:00:00.000Z',
  }, 'channel-stream-id');

  beforeEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('should check if a Genre exists and return false', async () => {
    expect(await streamRepository.exists(stream)).toBeFalsy();
  });

  it('should return all an empty array', async () => {
    expect(await streamRepository.findAll()).toEqual([]);
  });

  it('should return false if not relationships are found', async () => {
    expect(await streamRepository.hasRelationships(stream)).toBeFalsy();
  });

  it('should return false if cannot save', async () => {
    expect(await streamRepository.save(stream)).toBeTruthy();

    // @ts-ignore
    const { Item } = await streamRepository.getItem({
      PK: `ASSET#${StreamRepository.ROOT_ENTITY}#${stream.id}`,
      SK: `ASSET#${StreamRepository.ROOT_ENTITY}#${stream.id}`,
    });

    // Assert
    expect(Item).toBeDefined();
    if (Item) {
      expect(Item.PK).toEqual(`ASSET#${StreamRepository.ROOT_ENTITY}#${stream.id}`);
      expect(Item.SK).toEqual(`ASSET#${StreamRepository.ROOT_ENTITY}#${stream.id}`);
      expect(Item['GSI1-PK']).toEqual(`ASSET#${StreamRepository.ROOT_ENTITY}`);
      expect(Item['GSI1-SK']).toEqual(stream.name);
      expect(Item.entityType).toEqual(StreamRepository.ROOT_ENTITY);
    }
  });

  it('should return undefined if not found', async () => {
    expect(await streamRepository.findOne(stream.id)).toBeUndefined();
  });

  it('should return empty array if not found', async () => {
    expect(await streamRepository.findMany([stream.id])).toEqual([]);
  });
});

describe('StreamRepository - Non-Empty database', () => {
  let stream: Stream;

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    stream = await streamFactory.toDomain(Stream.create({
      extId: 'provider-extId',
      name: 'Provider Reelz_SD',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      daiParams: true,
      weight: 1,
      data: 'my-stream-data',
      enabled: true,
    }, 'stream-id'));
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('save - should save a Stream instance', async () => {
    expect(await streamRepository.save(stream)).toBeTruthy();
  });

  it('findOne - should get previously saved Stream instance', async () => {
    const resultChannel = await streamRepository.findOne(stream.id);

    expect(resultChannel).toBeDefined();
    expect(resultChannel?.id).toEqual(stream.id);
  });

  it('findAll - should get previously saved Stream instances', async () => {
    const resultChannel = await streamRepository.findAll();

    expect(resultChannel.length).toBeGreaterThan(0);
    expect(resultChannel[0].id).toEqual(stream.id);
  });

  it('findMany - should get previously saved Stream instances', async () => {
    const resultChannel = await streamRepository.findMany([stream.id]);

    expect(resultChannel.length).toBeGreaterThan(0);
    expect(resultChannel[0].id).toEqual(stream.id);
  });

  it('remove - should remove previously saved Stream instances', async () => {
    expect(await streamRepository.remove(stream)).toBeTruthy();

    const resultChannel = await streamRepository.findOne(stream.id);
    expect(resultChannel).toBeUndefined();
  });
});

describe.each([
  (payload: Stream) => streamRepository.remove(payload),
  (payload: Stream) => streamRepository.save(payload),
  (payload: Stream) => streamRepository.exists(payload),
  (payload: Stream) => streamRepository.hasRelationships(payload),
  (id: string) => streamRepository.findOne(id),
  // An empty id list never reaches DynamoDB, so pass an id to hit the missing table
  () => streamRepository.findMany(['any-id']),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
