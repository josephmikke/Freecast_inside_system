import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import ProviderMap from '../../shared/ProviderMap';
import eventMock from '../../shared/tests/event-mock';
import ProviderRepository from '../../shared/ProviderRepository';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetProvidersDomain from '../GetProvidersDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-getProviderAdaptor';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

describe('ApiGatewayAdaptor', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
  });
  const mock = {
    ...eventMock,
  };

  const providerMap = new ProviderMap(new UIDGenerator());

  describe('success path', () => {
    const providerRepository = new ProviderRepository(
      client,
      TEST_TABLE_NAME,
      providerMap,
    );
    const domain = new GetProvidersDomain(providerRepository);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    it('should return a status code 200 with an empty Provider array', async () => {
      expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
        body: '{"providers":[]}',
        statusCode: 200,
      });
    });

    it('should return a status code 200 with all providers', async () => {
      const providers = await Promise.all(Array.from(Array(20)
        .keys()).map(async (item, key) => {
        const provider = providerMap.toDomain({
          configuration: {},
          type: [ProviderContentType.CHANNELS],
          subscription: false,
          format: ProviderNumberFormat.INTEGER,
          name: `Provider ${key}`,
          extId: `provider-${key}`,
          enabled: true,
          mtSlug: `prod_vod_Stream${key}`
        });
        await providerRepository.save(provider);
        return provider;
      }));
      providers.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });
      expect(await apiGatewayAdaptor.handler(mock)).toMatchObject({
        body: JSON.stringify({ providers }),
        statusCode: 200,
      });
    });
  });

  describe('error path', () => {
    it('should throw an error 500 - Empty table name', async () => {
      const providerRepository = new ProviderRepository(
        client,
        '',
        providerMap,
      );
      const domain = new GetProvidersDomain(providerRepository);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      expect(await apiGatewayAdaptor.handler(mock)).toEqual({ body: '', statusCode: 500 });
    });
  });
});
