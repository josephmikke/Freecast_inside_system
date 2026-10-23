import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { CategoryDto } from '../../../shared/dto/CategoryDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Category from '../../shared/Category';
import CategoryMap from '../../shared/CategoryMap';
import CategoryRepository from '../../shared/CategoryRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeleteCategoryDomain from '../DeleteCategoryDomain';

const TEST_TABLE_NAME = 'test-deleteCategoryAdaptor';
const CATEGORY_ID = '42';

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}

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
    id: CATEGORY_ID,
  },
};

const categoryDto: Required<Omit<CategoryDto, 'id'>> = {
  extId: 'local:local-now',
  name: 'Local Now',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
  weight: 0,
};

const uid = {
  generate: () => '42',
};

const categoryMap = new CategoryMap(uid);
const categoryRepository = new CategoryRepository(
  ddbClient,
  TEST_TABLE_NAME,
  categoryMap,
);
const domain = new DeleteCategoryDomain(categoryRepository, new MockLogTracker());
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

describe('ApiGatewayAdaptor', () => {
  describe('error path', () => {
    beforeAll(async () => {
      await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    });

    afterAll(async () => {
      await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
    });

    it('should return a 500 status code', async () => {
      expect(await apiGatewayAdaptor.handler({
        ...handlerPayloadMock,
        // @ts-ignore
        pathParameters: undefined,
      })).toStrictEqual({
        body: '',
        statusCode: 500,
      });
    });

    it('should return a 404 not found', async () => {
      expect(await apiGatewayAdaptor.handler(handlerPayloadMock)).toStrictEqual({
        body: '{"error":"Category Not Found"}',
        statusCode: 404,
      });
    });

    it('should return a 422 status code if given Category has dependencies', async () => {
      const category = Category.create(categoryDto, CATEGORY_ID);
      await categoryRepository.save(category);
      const itemsAttachedToCategory = Array.from(Array(2).keys()).map((_, key) => ({
        PK: `C#${key}`,
        SK: `ASSET#CATEGORY#${CATEGORY_ID}`,
        entityType: 'CHANNEL',
        'GSI1-PK': `ASSET#CATEGORY#${CATEGORY_ID}`,
        'GSI1-SK': `C#${key}`,
      }));
      await categoryRepository.batchWriteItem(itemsAttachedToCategory);

      expect(await apiGatewayAdaptor.handler(handlerPayloadMock)).toStrictEqual({
        body: '{"error":"Cannot delete a Category with dependencies"}',
        statusCode: 422,
      });
    });
  });

  describe('success path', () => {
    beforeAll(async () => {
      await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    });

    afterAll(async () => {
      await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
    });

    it('should return a 204 status code', async () => {
      const category = Category.create(categoryDto, CATEGORY_ID);
      await categoryRepository.save(category);

      expect(await apiGatewayAdaptor.handler(handlerPayloadMock)).toStrictEqual({
        body: '',
        statusCode: 204,
      });
    });
  });
});
