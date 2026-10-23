import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { ProviderContentType, ProviderDto, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Provider from '../../shared/Provider';
import ProviderMap from '../../shared/ProviderMap';
import ProviderRepository from '../../shared/ProviderRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeleteProviderDomain from '../DeleteProviderDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-deleteProviderAdaptor';
const PROVIDER_ID = new UIDGenerator().generate(8);
const ORPHAN_PROVIDER_ID = new UIDGenerator().generate(8);

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
    id: PROVIDER_ID,
  },
};

const providerDto: Omit<ProviderDto, 'id'> = {
  name: 'Local now',
  extId: 'local-now',
  configuration: {},
  type: [ProviderContentType.CHANNELS],
  subscription: false,
  format: ProviderNumberFormat.INTEGER,
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
  mtSlug: 'prod_vod_LocalNow',
};

const uid = {
  generate: () => PROVIDER_ID,
};

const providerMap = new ProviderMap(uid);
const providerRepository = new ProviderRepository(
  ddbClient,
  TEST_TABLE_NAME,
  providerMap,
);
const domain = new DeleteProviderDomain(providerRepository, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const CASES = [{
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: ORPHAN_PROVIDER_ID } },
  expected: {
    body: '',
    statusCode: 204,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: 'random' } },
  expected: {
    body: '{"error":"Provider Not Found"}',
    statusCode: 404,
  },
},
{
  mockEvent: handlerPayloadMock,
  expected: {
    body: '{"error":"Cannot delete a Provider with dependencies"}',
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
    const provider = Provider.create(providerDto, PROVIDER_ID);
    const orphanProvider = Provider.create(providerDto, ORPHAN_PROVIDER_ID);
    await providerRepository.save(provider);
    await providerRepository.save(orphanProvider);

    const itemsAttachedToProvider = Array.from(Array(2).keys()).map((_, key) => ({
      PK: `C#${key}`,
      SK: `ASSET#PROVIDER#${PROVIDER_ID}`,
      entityType: 'CHANNEL',
      'GSI1-PK': `ASSET#PROVIDER#${PROVIDER_ID}`,
      'GSI1-SK': `C#${key}`,
    }));
    await providerRepository.batchWriteItem(itemsAttachedToProvider);
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
