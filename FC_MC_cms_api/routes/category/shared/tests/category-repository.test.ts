import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import Category from '../Category';
import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import CategoryRepository from '../CategoryRepository';
import { CategoryDto } from '../../../shared/dto/CategoryDto';
import CategoryMap from '../CategoryMap';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-categoryRepository';

const categoryDto: Required<Omit<CategoryDto, 'id'>> = {
  extId: 'local:local-now',
  name: 'Local Now',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
  weight: 0,
};

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

describe('Category Repository', () => {
  const category = Category.create(categoryDto, 'categoryId');
  const categoryMap = new CategoryMap(new UIDGenerator());
  const repository = new CategoryRepository(client, TEST_TABLE_NAME, categoryMap);

  describe('save', () => {
    beforeAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
    });

    afterAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
    });

    it('should save a new Category', async () => {
      expect(await repository.save(category)).toBeTruthy();
    });

    it('should throw an error', async () => {
      // @ts-ignore
      await expect(async () => repository.save({})).rejects.toThrow();
    });
  });

  describe('exists', () => {
    beforeAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
    });

    afterAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
    });

    it('should check if a Category exists and return false', async () => {
      expect(await repository.exists(category)).toBeFalsy();
    });

    it('should check if a Category exists and return true', async () => {
      expect(await repository.save(category)).toBeTruthy();
      expect(await repository.exists(category)).toBeTruthy();
    });

    it('should throw an error', async () => {
      // @ts-ignore
      await expect(async () => repository.exists()).rejects.toThrow();
    });
  });

  describe('findAll', () => {
    beforeAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
    });

    afterAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
    });

    it('should return all an empty array', async () => {
      expect(await repository.findAll()).toEqual([]);
    });

    it('should return all categories sorted by weight', async () => {
      const categories = await Promise.all(Array.from(Array(20)
        .keys()).map(async (item, key) => {
        const categoryEntity = categoryMap.toDomain({
          name: `Category ${key}`,
          extId: `cat-${key}`,
          weight: key,
        });
        await repository.save(categoryEntity);
        return categoryEntity;
      }));
      expect(await repository.findAll()).toMatchObject(categories);
    });

    it('should throw an error', async () => {
      // @ts-ignore
      const invalidRepo = new CategoryRepository(client, '', categoryMap);
      await expect(async () => invalidRepo.findAll()).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    beforeAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
      await repository.save(category);
    });

    afterAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
    });

    it('should find one item given an id', async () => {
      expect(await repository.findOne('categoryId')).toEqual(category);
    });

    it('should find one item given an id', async () => {
      const invalidRepo = new CategoryRepository(client, '', categoryMap);

      await expect(async () => invalidRepo.findOne('categoryId')).rejects.toThrow();
    });
  });

  describe('findMany', () => {
    beforeAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
      await repository.save(category);
    });

    afterAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
    });

    it('should find requested categories', async () => {
      const newCategory = Category.create({
        extId: 'local:local-now',
        name: 'Local Now',
        createdAt: '2022-11-10T17:10:000Z',
        updatedAt: '2022-11-10T17:10:000Z',
        enabled: true,
        weight: 0,
      }, 'categoryNewId');
      await expect(await (await repository.findMany(['categoryId', 'categoryNewId'])).length).toEqual(1);
      await repository.save(newCategory);
      await expect(await (await repository.findMany(['categoryId', 'categoryNewId'])).length).toEqual(2);
    });
  });

  describe('hasRelationships', () => {
    beforeAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
      await repository.save(category);
    });

    afterAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
    });

    it('should return false if not relationships are found', async () => {
      expect(await repository.hasRelationships(category)).toBeFalsy();
    });

    it('should return true if relationships are found', async () => {
      const items = Array.from(Array(2).keys()).map((_, key) => ({
        PK: `C#${key}`,
        SK: 'ASSET#CATEGORY#categoryId',
        entityType: 'CHANNEL',
        'GSI1-PK': 'ASSET#CATEGORY#categoryId',
        'GSI1-SK': `C#${key}`,
      }));
      await repository.batchWriteItem(items);

      expect(await repository.hasRelationships(category)).toBeTruthy();
    });

    it('should throw an error', async () => {
      // @ts-ignore
      await expect(async () => repository.hasRelationships()).rejects.toThrow();
    });
  });

  describe('remove', () => {
    beforeAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
      await repository.save(category);
    });

    afterAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
    });

    it('should remove an item', async () => {
      expect(await repository.findOne(category.id)).toBeDefined();

      expect(await repository.remove(category)).toBeTruthy();

      expect(await repository.findOne(category.id)).toBeUndefined();
    });

    it('should throw an error', async () => {
      // @ts-ignore
      await expect(async () => repository.remove()).rejects.toThrow();
    });
  });

  describe('getParentRelationships', () => {
    beforeAll(async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
      await repository.save(category);
    });

    it('should not find relations', async () => {
      expect(await repository.getParentRelationships('CHANNEL', 'id')).toBeDefined();
    });

    it('should throw an error', async () => {
      await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
      // @ts-ignore
      await expect(async () => repository.getParentRelationships()).rejects.toThrow();
    });
  });
});
