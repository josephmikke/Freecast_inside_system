import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { ICategoryRepository, ParentDocument } from './ICategoryRepository';
import Category from './Category';

import { CategoryDto, CategoryRequestDto } from '../../shared/dto/CategoryDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { IMapper } from '../../shared/interfaces/IMapper';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';

interface CategoryDocument extends Required<CategoryDto>, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  'GSI5-PK': string;
  'GSI5-SK': number;
  searchName: string;
  searchExtId: string;
}

export default class CategoryRepository extends BaseRepository implements ICategoryRepository {
  private categoryMap: IMapper<Category, CategoryRequestDto, CategoryDto>;

  constructor(
    client: DynamoDBClient,
    tableName: string,
    categoryMap: IMapper<Category, CategoryRequestDto, CategoryDto>,
  ) {
    super(client, tableName);
    this.categoryMap = categoryMap;
  }

  async hasRelationships(category: Category): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#CATEGORY#${category.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async getParentRelationships(parent: string, parentId: string): Promise<Array<ParentDocument>> {
    try {
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${parent}#${parentId}`,
          ':SK': 'ASSET#CATEGORY',
        },
        ProjectionExpression: 'PK, SK, id, weight',
      });
      return Items as Array<ParentDocument>;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(category: Category): Promise<boolean> {
    try {
      return !!await this.deleteDocument({
        PK: `ASSET#CATEGORY#${category.id}`,
        SK: `ASSET#CATEGORY#${category.id}`,
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(category: Category): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        FilterExpression: '#extId = :extId',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#extId': 'searchExtId',
        },
        ExpressionAttributeValues: {
          ':PK': 'ASSET#CATEGORY',
          ':extId': category.extId.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findAll() {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI5',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI5-PK',
        },
        ExpressionAttributeValues: {
          ':PK': 'ASSET#CATEGORY',
        },
      });
      return (Items as CategoryDocument[])?.map(
        (category) => this.categoryMap.toDto(category),
      );
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findMany(ids: string[]): Promise<Category[]> {
    try {
      const items = await this.batchGetItem(ids.map((id) => ({
        PK: `ASSET#CATEGORY#${id}`,
        SK: `ASSET#CATEGORY#${id}`,
      })));
      return await Promise.all((items as CategoryDocument[])?.map(
        async (category) => this.categoryMap.toDomain(category),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(category: Category): Promise<boolean> {
    try {
      const categoryDocument: CategoryDocument = {
        id: category.id,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        enabled: category.enabled,
        PK: `ASSET#CATEGORY#${category.id}`,
        SK: `ASSET#CATEGORY#${category.id}`,
        'GSI1-PK': 'ASSET#CATEGORY',
        'GSI1-SK': category.name,
        entityType: 'CATEGORY',
        searchName: category.name.toLowerCase(),
        searchExtId: category.extId.toLowerCase(),
        extId: category.extId,
        name: category.name,
        'GSI5-PK': 'ASSET#CATEGORY',
        'GSI5-SK': category.weight,
        weight: category.weight,
      };
      await this.putItem(categoryDocument);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findOne(id: string): Promise<Category | undefined> {
    try {
      const { Item } = await this.getItem({
        PK: `ASSET#CATEGORY#${id}`,
        SK: `ASSET#CATEGORY#${id}`,
      });
      if (!Item) return undefined;
      return this.categoryMap.toDto(Item as CategoryDocument);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async updateWeight(categories: Array<Category>): Promise<boolean> {
    try {
      const updatedCategories = categories.map((category) => ({
        id: category.id,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        enabled: category.enabled,
        PK: `ASSET#CATEGORY#${category.id}`,
        SK: `ASSET#CATEGORY#${category.id}`,
        'GSI1-PK': 'ASSET#CATEGORY',
        'GSI1-SK': category.name,
        entityType: 'CATEGORY',
        searchName: category.name.toLowerCase(),
        searchExtId: category.extId.toLowerCase(),
        extId: category.extId,
        name: category.name,
        'GSI5-PK': 'ASSET#CATEGORY',
        'GSI5-SK': category.weight,
        weight: category.weight,
      }));

      return !!await this.batchWriteItem(updatedCategories);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
