import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { IStreamRepository } from './IStreamRepository';
import Stream from './Stream';

import { IFactory } from '../../shared/interfaces/IFactory';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';
import { StreamRequestDto, StreamDto } from '../../shared/dto/StreamDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

interface StreamDocument extends StreamDto, BaseDocument {
  PK: string;
  SK: string
  'GSI1-PK': string;
  'GSI1-SK': string;
  entityType: string;
}

export default class StreamRepository
  extends BaseRepository implements IStreamRepository {
  static ROOT_ENTITY = 'STREAM';

  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly streamFactory:
    IFactory<Stream, StreamRequestDto, StreamDto>,
  ) {
    super(client, tableName);
    this.streamFactory = streamFactory;
  }

  private static getRootEntity(id: string, items: Record<string, any>[]) {
    const [streamItem] = items.filter((item) => item.SK === `ASSET#${StreamRepository.ROOT_ENTITY}#${id}`);
    return streamItem as StreamDocument;
  }

  async findAll(): Promise<Stream[]> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${StreamRepository.ROOT_ENTITY}`,
        },
      });
      return await Promise.all((Items as StreamDocument[])?.map(
        async (item: StreamDocument) => this.streamFactory.toDomain(item),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findMany(ids: Array<string>): Promise<Array<Stream>> {
    try {
      const Items = await this.batchGetItem(ids.map((id) => ({
        PK: `ASSET#${StreamRepository.ROOT_ENTITY}#${id}`,
        SK: `ASSET#${StreamRepository.ROOT_ENTITY}#${id}`,
      })));
      return await Promise.all((Items as StreamDocument[])?.map(
        async (item: StreamDocument) => this.streamFactory.toDomain(item),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findOne(id: string): Promise<Stream | undefined> {
    try {
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${StreamRepository.ROOT_ENTITY}#${id}`,
          ':SK': 'ASSET#',
        },
      });
      if (!Items?.length) return undefined;
      const streamItem = StreamRepository.getRootEntity(id, Items);
      return await this.streamFactory.toDomain(streamItem as StreamDocument);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async hasRelationships(item: Stream): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${StreamRepository.ROOT_ENTITY}#${item.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(item: Stream): Promise<boolean> {
    try {
      const streamItem = this.streamFactory.toPersistence(item);
      const streamDocument = {
        PK: `ASSET#${StreamRepository.ROOT_ENTITY}#${item.id}`,
        SK: `ASSET#${StreamRepository.ROOT_ENTITY}#${item.id}`,
        'GSI1-PK': `ASSET#${StreamRepository.ROOT_ENTITY}`,
        'GSI1-SK': item.name,
        entityType: StreamRepository.ROOT_ENTITY,
        searchName: item.name.toLowerCase(),
        searchExtId: item.extId.toLowerCase(),
        ...streamItem,
      };

      await this.batchWriteItem([streamDocument]);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(item: Stream): Promise<boolean> {
    try {
      const streamItem = this.streamFactory.toPersistence(item);
      const rootDocument = {
        PK: `ASSET#${StreamRepository.ROOT_ENTITY}#${streamItem.id}`,
        SK: `ASSET#${StreamRepository.ROOT_ENTITY}#${streamItem.id}`,
      };
      return !!await this.batchDeleteDocuments([rootDocument]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(item: Stream): Promise<boolean> {
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
          ':PK': `ASSET#${StreamRepository.ROOT_ENTITY}`,
          ':extId': item.extId.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }
}
