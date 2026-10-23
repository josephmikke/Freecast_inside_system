import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import PlatformMap from '../../shared/PlatformMap';
import PlatformRepository from '../../shared/PlatformRepository';
import eventMock from '../../shared/tests/event-mock';
import AddPlatformDomain from '../AddPlatformDomain';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-addPlatformAdaptor';

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

const PLATFORM_ID = new UIDGenerator().generate(8);
const uid = {
  generate: () => PLATFORM_ID,
};
const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(
  ddbClient,
  TEST_TABLE_NAME,
  platformMap,
);
const domain = new AddPlatformDomain(platformRepository, platformMap, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const mock = {
  ...eventMock,
  body: {
    extId: 'extId:extId',
    name: 'Test',
  },
};

const CASES = [{
  mockEvent: mock,
  expected: {
    body: '',
    headers: {
      Location: `/platforms/${PLATFORM_ID}`,
    },
    statusCode: 201,
  },
}, {
  mockEvent: mock,
  expected: {
    body: '{"error":"Platform already exist"}',
    statusCode: 409,
  },
}];

beforeAll(async () => {
  await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
});

afterAll(async () => {
  await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
});

describe('addPlatform - ApiGatewayAdaptor', () => {
  describe('handler', () => {
    it('should return 500 as status code', async () => {
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler({ ...mock, body: undefined })).toStrictEqual({
        body: '',
        statusCode: 500,
      });
    });
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
    });
  });
});
