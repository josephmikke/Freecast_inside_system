import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Platform from '../../shared/Platform';
import PlatformMap from '../../shared/PlatformMap';
import PlatformRepository from '../../shared/PlatformRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeletePlatformDomain from '../DeletePlatformDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-deletePlatformAdaptor';
const PLATFORM_ID = new UIDGenerator().generate(8);
const ORPHAN_PLATFORM_ID = new UIDGenerator().generate(8);

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

const handlerPayloadMock = {
  ...eventMock,
  pathParameters: {
    id: PLATFORM_ID,
  },
};

const platformDto = {
  extId: 'local:local-now',
  name: 'Local Now',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};

const uid = {
  generate: () => PLATFORM_ID,
};

const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(
  ddbClient,
  TEST_TABLE_NAME,
  platformMap,
);
const domain = new DeletePlatformDomain(platformRepository, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const CASES = [{
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: ORPHAN_PLATFORM_ID } },
  expected: {
    body: '',
    statusCode: 204,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: 'random' } },
  expected: {
    body: '{"error":"Platform Not Found"}',
    statusCode: 404,
  },
},
{
  mockEvent: handlerPayloadMock,
  expected: {
    body: '{"error":"Cannot delete a Platform with dependencies"}',
    statusCode: 422,
  },
},
{
  mockEvent: { ...handlerPayloadMock, pathParameters: undefined },
  expected: {
    body: '',
    statusCode: 500,
  },
}];

describe('ApiGatewayAdaptor', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    const platform = Platform.create(platformDto, PLATFORM_ID);
    const orphanPlatform = Platform.create(platformDto, ORPHAN_PLATFORM_ID);
    await platformRepository.save(platform);
    await platformRepository.save(orphanPlatform);

    const itemsAttachedToPlatform = Array.from(Array(2).keys()).map((_, key) => ({
      PK: `C#${key}`,
      SK: `ASSET#PLATFORM#${PLATFORM_ID}`,
      entityType: 'CHANNEL',
      'GSI1-PK': `ASSET#PLATFORM#${PLATFORM_ID}`,
      'GSI1-SK': `C#${key}`,
    }));
    await platformRepository.batchWriteItem(itemsAttachedToPlatform);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
    });
  });
});
