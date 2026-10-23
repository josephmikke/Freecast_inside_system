import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import CategoryMap from '../../shared/CategoryMap';
import CategoryRepository from '../../shared/CategoryRepository';
import eventMock from '../../shared/tests/event-mock';
import AddCategoryDomain from '../AddCategoryDomain';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';

const TEST_TABLE_NAME = 'test-addCategoryAdaptor';

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

describe('ApiGatewayAdaptor', () => {
  const uid = {
    generate: () => '42',
  };
  const categoryMap = new CategoryMap(uid);

  beforeAll(async () => {
    await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
  });
  const mock = {
    ...eventMock,
    body: {
      extId: 'extId:extId',
      name: 'Test',
    },
  };

  describe('success path', () => {
    const categoryRepository = new CategoryRepository(
      client,
      TEST_TABLE_NAME,
      categoryMap,
    );
    const domain = new AddCategoryDomain(categoryRepository, categoryMap, new MockLogTracker());
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
    it('should return a 201 created with location header', async () => {
      expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
        body: '',
        headers: {
          Location: '/categories/42',
        },
        statusCode: 201,
      });
    });
  });

  describe('errpr path', () => {
    it('should throw a conflict exception', async () => {
      const categoryRepository = new CategoryRepository(
        client,
        TEST_TABLE_NAME,
        categoryMap,
      );
      const domain = new AddCategoryDomain(categoryRepository, categoryMap, new MockLogTracker());
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
      // Be carefull, this test depends of the previous test
      expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
        body: '{"error":"Category already exist"}',
        statusCode: 409,
      });
    });

    it('should throw an error 500', async () => {
      const categoryRepository = new CategoryRepository(
        client,
        '',
        categoryMap,
      );
      const domain = new AddCategoryDomain(categoryRepository, categoryMap, new MockLogTracker());
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
        body: '',
        statusCode: 500,
      });
    });
  });
});
