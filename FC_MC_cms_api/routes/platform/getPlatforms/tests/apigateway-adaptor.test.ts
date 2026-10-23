import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import eventMock from '../../shared/tests/event-mock';
import PlatformMap from '../../shared/PlatformMap';
import PlatformRepository from '../../shared/PlatformRepository';
import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetPlatformsDomain from '../GetPlatformsDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-getPlatformAdaptor';

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

  const platformMap = new PlatformMap(new UIDGenerator());

  describe('success path', () => {
    const platformRepository = new PlatformRepository(
      client,
      TEST_TABLE_NAME,
      platformMap,
    );
    const domain = new GetPlatformsDomain(platformRepository);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    it('should return a status code 200 with an empty Platform array', async () => {
      expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
        body: '{"platforms":[]}',
        statusCode: 200,
      });
    });

    it('should return a status code 200 with all platforms', async () => {
      const platforms = await Promise.all(Array.from(Array(20)
        .keys()).map(async (item, key) => {
        const platform = platformMap.toDomain({
          name: `Platform ${key}`,
          extId: `platform-${key}`,
        });
        await platformRepository.save(platform);
        return platform;
      }));
      platforms.sort((a, b) => {
        if (a.name < b.name) return -1;
        if (a.name > b.name) return 1;
        return 0;
      });
      expect(await apiGatewayAdaptor.handler(mock)).toMatchObject({
        body: JSON.stringify({ platforms }),
        statusCode: 200,
      });
    });
  });

  describe('error path', () => {
    it('should throw an error 500 - Empty table name', async () => {
      const platformRepository = new PlatformRepository(
        client,
        '',
        platformMap,
      );
      const domain = new GetPlatformsDomain(platformRepository);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      expect(await apiGatewayAdaptor.handler(mock)).toEqual({ body: '', statusCode: 500 });
    });
  });
});
