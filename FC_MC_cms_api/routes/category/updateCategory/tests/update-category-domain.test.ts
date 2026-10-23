import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Category from '../../shared/Category';
import { CategoryError } from '../../shared/CategoryError';
import CategoryMap from '../../shared/CategoryMap';
import CategoryRepository from '../../shared/CategoryRepository';
import UpdateCategoryDomain from '../UpdateCategoryDomain';

const TEST_TABLE_NAME = 'test-updateCategoryDomain';

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}

const uid = new UIDGenerator();
const categoryMap = new CategoryMap(uid);
const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});
const categoryRepository = new CategoryRepository(
  ddbClient,
  TEST_TABLE_NAME,
  categoryMap,
);
const domain = new UpdateCategoryDomain(categoryRepository, categoryMap, new MockLogTracker());

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-11-30'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('UpdateCategoryDomain', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe('updateCategory', () => {
    const category = Category.create({
      name: 'Local Now',
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      extId: 'local:now',
      enabled: true,
      weight: 0,
    }, '1');

    const existingCategory = Category.create({
      name: 'Local 2',
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      extId: 'local:2',
      enabled: true,
      weight: 1,
    }, '2');

    it('should throw Category Not Found', async () => {
      await expect(async () => domain.updateCategory('1', {
        name: 'Brand new Name',
      })).rejects.toThrow(CategoryError.CategoryNotFound);
    });

    it('should update a Category name with correct updatedAt time', async () => {
      await categoryRepository.save(category);

      expect(await domain.updateCategory('1', {
        name: 'Brand new Name',
      })).toBeTruthy();

      expect(await categoryRepository.findOne('1')).toEqual({
        ...category,
        updatedAt: '2022-11-30T00:00:00.000Z', // Should be the value as jest.setSystemTime()
        name: 'Brand new Name',
      });
    });

    it('should throw an error if extId already exist on another Category', async () => {
      await categoryRepository.save(existingCategory);

      await expect(async () => domain.updateCategory('1', {
        extId: 'local:2', // This id already exist in db
      })).rejects.toThrow(CategoryError.CategoryAlreadyExist);

      expect(await categoryRepository.findOne('2')).toEqual(existingCategory);
    });

    it('should update a Category extId, name and enabled', async () => {
      expect(await domain.updateCategory('1', {
        name: 'Again a new name',
        extId: 'local:1', // This id doesn't exist in db
        enabled: false,
      })).toBeTruthy();

      expect(await categoryRepository.findOne('1')).toEqual({
        id: '1',
        name: 'Again a new name',
        createdAt: '2022-11-10T17:10:000Z',
        updatedAt: '2022-11-30T00:00:00.000Z', // Should be the value as jest.setSystemTime()
        enabled: false,
        extId: 'local:1',
        weight: 0,
      });
    });
  });
});
