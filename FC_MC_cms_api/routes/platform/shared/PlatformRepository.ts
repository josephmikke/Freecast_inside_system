import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import Platform from './Platform';
import { IPlatformRepository } from './IPlatformRepository';

import { PlatformDto, PlatformRequestDto } from '../../shared/dto/PlatformDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { IFactory } from '../../shared/interfaces/IFactory';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';

interface PlatformDocument extends Required<PlatformRequestDto>, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  searchName: string;
  searchExtId: string;
}

const rootEntityType = 'PLATFORM';

export default class PlatformRepository extends BaseRepository implements IPlatformRepository {
  private platformMap: IFactory<Platform, PlatformRequestDto, PlatformDto>;

  constructor(
    client: DynamoDBClient,
    tableName: string,
    platformMap: IFactory<Platform, PlatformRequestDto, PlatformDto>,
  ) {
    super(client, tableName);
    this.platformMap = platformMap;
  }

  async findMany(ids: string[]): Promise<Platform[]> {
    try {
      const items = await this.batchGetItem(ids.map((id) => ({
        PK: `ASSET#${rootEntityType}#${id}`,
        SK: `ASSET#${rootEntityType}#${id}`,
      })));
      return await Promise.all((items as PlatformDocument[])?.map(
        async (platform) => this.platformMap.toDomain(platform),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async hasRelationships(platform: Platform): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${rootEntityType}#${platform.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(platform: Platform): Promise<boolean> {
    try {
      return !!await this.deleteDocument({
        PK: `ASSET#${rootEntityType}#${platform.id}`,
        SK: `ASSET#${rootEntityType}#${platform.id}`,
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(platform: Platform): Promise<boolean> {
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
          ':PK': `ASSET#${rootEntityType}`,
          ':extId': platform.extId.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findAll() {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${rootEntityType}`,
        },
      });
      return await Promise.all((Items as PlatformDocument[])?.map(
        (platform) => this.platformMap.toDomain(platform),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(platform: Platform): Promise<boolean> {
    try {
      const platformDocument: PlatformDocument = {
        id: platform.id,
        createdAt: platform.createdAt,
        updatedAt: platform.updatedAt,
        enabled: platform.enabled,
        PK: `ASSET#${rootEntityType}#${platform.id}`,
        SK: `ASSET#${rootEntityType}#${platform.id}`,
        'GSI1-PK': `ASSET#${rootEntityType}`,
        'GSI1-SK': platform.name,
        entityType: 'PLATFORM',
        searchName: platform.name.toLowerCase(),
        searchExtId: platform.extId.toLowerCase(),
        extId: platform.extId,
        name: platform.name,
      };
      await this.putItem(platformDocument);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findOne(id: string): Promise<Platform | undefined> {
    try {
      const { Item } = await this.getItem({
        PK: `ASSET#${rootEntityType}#${id}`,
        SK: `ASSET#${rootEntityType}#${id}`,
      });
      if (!Item) return undefined;
      return await this.platformMap.toDomain(Item as PlatformDocument);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
