import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import eventMock from '../../shared/tests/event-mock';
import CategoryMap from '../../shared/CategoryMap';
import CategoryRepository from '../../shared/CategoryRepository';
import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetCategoriesDomain from '../GetCategoriesDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-getCategoriesAdaptor';

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

  const categoryMap = new CategoryMap(new UIDGenerator());

  describe('success path', () => {
    const categoryRepository = new CategoryRepository(
      client,
      TEST_TABLE_NAME,
      categoryMap,
    );
    const domain = new GetCategoriesDomain(categoryRepository);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    it('should return a status code 200 with an empty Category array', async () => {
      expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
        body: '{"categories":[]}',
        statusCode: 200,
      });
    });

    it('should return a status code 200 with all Categories', async () => {
      const categories = await Promise.all(Array.from(Array(20)
        .keys()).map(async (item, key) => {
        const category = categoryMap.toDomain({
          name: `Category ${key}`,
          extId: `cat-${key}`,
          weight: key,
        });
        await categoryRepository.save(category);
        return category;
      }));

      expect(await apiGatewayAdaptor.handler(mock)).toMatchObject({
        body: JSON.stringify({ categories }),
        statusCode: 200,
      });
    });
  });

  describe('error path', () => {
    it('should throw an error 500 - Empty table name', async () => {
      const categoryRepository = new CategoryRepository(
        client,
        '',
        categoryMap,
      );
      const domain = new GetCategoriesDomain(categoryRepository);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      expect(await apiGatewayAdaptor.handler(mock)).toEqual({ body: '', statusCode: 500 });
    });
  });
});
