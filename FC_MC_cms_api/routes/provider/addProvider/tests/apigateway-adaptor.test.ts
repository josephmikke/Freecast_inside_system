import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import ProviderMap from '../../shared/ProviderMap';
import ProviderRepository from '../../shared/ProviderRepository';
import eventMock from '../../shared/tests/event-mock';
import AddProviderDomain from '../AddProviderDomain';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-addProviderAdaptor';

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

const PROVIDER_ID = new UIDGenerator().generate(8);
const uid = {
  generate: () => PROVIDER_ID,
};
const providerMap = new ProviderMap(uid);
const providerRepository = new ProviderRepository(
  ddbClient,
  TEST_TABLE_NAME,
  providerMap,
);
const domain = new AddProviderDomain(providerRepository, providerMap, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const mock = {
  ...eventMock,
  body: {
    name: 'Local now',
    extId: 'local-now',
    configuration: {},
    type: [ProviderContentType.CHANNELS],
    subscription: false,
    format: ProviderNumberFormat.INTEGER,
    mtSlug: 'prod_vod_LocalNow',
    aidSlug: '123456',
  },
};

const CASES = [{
  mockEvent: mock,
  expected: {
    body: '',
    headers: {
      Location: `/providers/${PROVIDER_ID}`,
    },
    statusCode: 201,
  },
}, {
  mockEvent: mock,
  expected: {
    body: '{"error":"Provider already exist"}',
    statusCode: 409,
  },
}, {
  mockEvent: eventMock,
  expected: {
    body: '',
    statusCode: 500,
  },
}];

beforeAll(async () => {
  await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
});

afterAll(async () => {
  await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
});

describe('addProvider - ApiGatewayAdaptor', () => {
  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
    });
  });
});
