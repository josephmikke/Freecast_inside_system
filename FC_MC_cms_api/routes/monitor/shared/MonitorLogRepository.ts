import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { MonitorLogDTO } from '../../shared/dto/MonitorLogDto';
import { IMonitorLogRepository } from './IMonitorLogInerface';
import MonitorLogFactory from './MonitorLogFactory';

const ENTITY_TYPE = 'ALARM';

export default class MonitorLogRepository extends BaseRepository implements IMonitorLogRepository {
  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly monitorFactory: MonitorLogFactory,
  ) {
    super(client, tableName);
  }

  async findAll(): Promise<MonitorLogDTO[]> {
    try {
      let allItems: any[] = [];
      let lastEvaluatedKey: Record<string, any> | undefined;

      do {
        const { Items, LastEvaluatedKey } = await this.query({
          IndexName: 'GSI1',
          KeyConditionExpression: '#PK = :PK',
          ExpressionAttributeNames: {
            '#PK': 'GSI1-PK',
          },
          ExpressionAttributeValues: {
            ':PK': `ASSET#${ENTITY_TYPE}`,
          },
          ExclusiveStartKey: lastEvaluatedKey,
          Limit: 1000, // Maximum items per query
        });

        if (Items && Items.length > 0) {
          allItems = allItems.concat(Items);
        }

        lastEvaluatedKey = LastEvaluatedKey;
      } while (lastEvaluatedKey);

      if (!allItems.length) return [];

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      return await Promise.all(allItems.map(async (item) => {
        const sortedTimestamps = item['event-time']
          .map((time: string | number | Date) => new Date(time).getTime())
          .filter((timestamp: number) => timestamp >= twentyFourHoursAgo.getTime())
          .sort((a: number, b: number) => b - a) // Sort descending
          .slice(0, 5) // Get first 5 timestamps (most recent)
          .map((time: number) => new Date(time));

        // If no timestamps within last 24 hours, skip this item
        if (sortedTimestamps.length === 0) {
          return null;
        }

        return this.monitorFactory.toDomain({
          id: item.id,
          channel: item['flow-name'],
          timestamp: sortedTimestamps,
          message: item.description,
          level: item['GSI1-SK'],
          metadata: {
            flowArn: item['flow-arn'],
            extId: item.extId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            entity: item.entity,
            title: item.title
          }
        });
      })).then(results => results.filter(Boolean) as MonitorLogDTO[]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(item: MonitorLogDTO): Promise<boolean> {
    try {
      if (!item.channel || !item.message || !item.level) {
        throw new Error('Invalid monitor log data: Required fields are missing');
      }

      const now = new Date().toISOString();
      const createdItem = this.monitorFactory.create(item);

      const dbItem = {
        id: createdItem.id,
        createdAt: now,
        updatedAt: now,
        PK: `ASSET#${ENTITY_TYPE}#${createdItem.id}`,
        SK: `ASSET#${ENTITY_TYPE}#${createdItem.id}`,
        'GSI1-PK': `ASSET#${ENTITY_TYPE}`,
        'GSI1-SK': item.level,
        entityType: ENTITY_TYPE,
        'flow-name': item.channel,
        // DynamoDB cannot marshal a Date instance, so event times persist as ISO strings;
        // the read path already accepts string | number | Date coming back out.
        'event-time': item.timestamp.map(time => new Date(time).toISOString()),
        'description': item.message,
        'entity': ENTITY_TYPE,
        'flow-arn': item.metadata?.flowArn,
        'extId': item.metadata?.extId,
        'title': item.metadata?.title,
        ...item.metadata
      };

      await this.putItem(dbItem);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async findOne(flow: string): Promise<MonitorLogDTO[]> {
    try {
      let allItems: any[] = [];
      let lastEvaluatedKey: Record<string, any> | undefined;

      do {
        const { Items, LastEvaluatedKey } = await this.query({
          IndexName: 'GSI1',
          KeyConditionExpression: '#PK = :PK',
          FilterExpression: '#flowName = :flowName',
          ExpressionAttributeNames: {
            '#PK': 'GSI1-PK',
            '#flowName': 'flow-name'
          },
          ExpressionAttributeValues: {
            ':PK': `ASSET#${ENTITY_TYPE}`,
            ':flowName': flow
          },
          ExclusiveStartKey: lastEvaluatedKey,
          Limit: 1000,
        });

        if (Items && Items.length > 0) {
          allItems = allItems.concat(Items);
        }

        lastEvaluatedKey = LastEvaluatedKey;
      } while (lastEvaluatedKey);

      if (!allItems.length) return [];

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      return await Promise.all(allItems.map(async (item) => {
        const sortedTimestamps = item['event-time']
          .map((time: string | number | Date) => new Date(time).getTime())
          .sort((a: number, b: number) => b - a) // Sort descending
          .map((time: number) => new Date(time));

        // If no timestamps within last 24 hours, skip this item
        if (sortedTimestamps.length === 0) {
          return null;
        }

        return this.monitorFactory.toDomain({
          id: item.id,
          channel: item['flow-name'],
          timestamp: sortedTimestamps,
          message: item.description,
          level: item['GSI1-SK'],
          metadata: {
            flowArn: item['flow-arn'],
            extId: item.extId,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            entity: item.entity,
            title: item.title
          }
        });
      })).then(results => results.filter(Boolean) as MonitorLogDTO[]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(item: MonitorLogDTO): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        FilterExpression: '#extId = :extId',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#extId': 'extId'
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${ENTITY_TYPE}`,
          ':extId': item.metadata?.extId
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

}
