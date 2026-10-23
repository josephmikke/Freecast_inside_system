import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { AutoIngestionDto, AutoIngestionRequestDto } from '../../shared/dto/AutoIngestionDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';

import AutoIngestion from './AutoIngestion';
import { AutoIngestionFactoryDto } from './AutoIngestionFactory';
import { IAutoIngestionRepository } from './IAutoIngestionRepository';

interface AutoIngestionDocument extends Required<AutoIngestionDto>, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  searchMrssFeed: string;
}

const rootEntityType = 'AUTOINGESTION';

export default class AutoIngestionRepository extends BaseRepository implements IAutoIngestionRepository {
  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly autoIngestionFactory: IFactory<AutoIngestion, AutoIngestionRequestDto, AutoIngestionFactoryDto>,
  ) {
    super(client, tableName);
  }

  async remove(item: AutoIngestion): Promise<boolean> {
    try {
      return !!await this.deleteDocument({
        PK: `ASSET#${rootEntityType}#${item.id}`,
        SK: `ASSET#${rootEntityType}#${item.id}`,
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(item: AutoIngestion): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        FilterExpression: '#mrssFeed = :mrssFeed',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#mrssFeed': 'searchMrssFeed',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${rootEntityType}`,
          ':mrssFeed': item.mrss_feed.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findAll(): Promise<AutoIngestion[]> {
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
      return await Promise.all((Items as AutoIngestionDocument[])?.map(
        async (item) => this.autoIngestionFactory.toDomain(item),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(item: AutoIngestion): Promise<boolean> {
    try {
      const autoIngestionDocument: AutoIngestionDocument = {
        id: item.id,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        enabled: item.enabled,
        providerID: item.providerID,
        package_ids: item.package_ids,
        platform_ids: item.platform_ids,
        mrss_feed: item.mrss_feed,
        schedule: item.schedule,
        timezone: item.timezone,
        ingestion_ids: item.ingestion_ids,
        scheduler_id: item.scheduler_id,
        PK: `ASSET#${rootEntityType}#${item.id}`,
        SK: `ASSET#${rootEntityType}#${item.id}`,
        'GSI1-PK': `ASSET#${rootEntityType}`,
        'GSI1-SK': item.providerID,
        entityType: rootEntityType,
        searchMrssFeed: item.mrss_feed.toLowerCase(),
      };
      await this.putItem(autoIngestionDocument);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async appendIngestionId(item: AutoIngestion, ingestionId: string): Promise<boolean> {
    try {
      return !!await this.updateItem({
        Key: {
          PK: `ASSET#${rootEntityType}#${item.id}`,
          SK: `ASSET#${rootEntityType}#${item.id}`,
        },
        UpdateExpression: 'SET ingestion_ids = list_append(if_not_exists(ingestion_ids, :empty), :ingestionId), updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':empty': [],
          ':ingestionId': [ingestionId],
          ':updatedAt': new Date().toISOString(),
        },
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findOne(id: string): Promise<AutoIngestion | undefined> {
    try {
      const { Item } = await this.getItem({
        PK: `ASSET#${rootEntityType}#${id}`,
        SK: `ASSET#${rootEntityType}#${id}`,
      });
      if (!Item) return undefined;
      return await this.autoIngestionFactory.toDomain(Item as AutoIngestionDocument);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
