import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { ILogRepository, LogPage } from './ILogRepository';
import Log from './Log';

import { LogDto, LogParameters, LogRequestDto } from '../../shared/dto/LogDto';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';
import { IFactory } from '../../shared/interfaces/IFactory';
import { SortType } from '../../shared/dto/ChannelDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

interface LogDocument extends Required<LogDto>, BaseDocument {
  PK: string;
  SK: string;
  'GSI1-PK': string;
  'GSI1-SK': string;
  'GSI4-PK': string;
  'GSI4-SK': string;
  entityType: string;
}

export default class LogRepository
  extends BaseRepository implements ILogRepository {
  static ROOT_ENTITY = 'LOG';

  static tableRelations = {
    [SortType.NAME]: {
      index: 'GSI1',
      PK: `ASSET#${LogRepository.ROOT_ENTITY}`,
    },
    [SortType.CREATED]: {
      index: 'GSI4',
      PK: `ASSET#${LogRepository.ROOT_ENTITY}#CREATED`,
    },
  };

  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly logFactory:
    IFactory<Log, LogRequestDto, LogDto>,
  ) {
    super(client, tableName);
    this.logFactory = logFactory;
  }

  async save(log: Log): Promise<boolean> {
    try {
      const logItem = this.logFactory.toPersistence(log);
      const logDocument = {
        PK: `ASSET#${LogRepository.ROOT_ENTITY}#${log.id}`,
        SK: `ASSET#${LogRepository.ROOT_ENTITY}#${log.id}`,
        [`${LogRepository.tableRelations[SortType.NAME].index}-PK`]: LogRepository.tableRelations[SortType.NAME].PK,
        [`${LogRepository.tableRelations[SortType.NAME].index}-SK`]: log.entity.toLowerCase(),
        [`${LogRepository.tableRelations[SortType.CREATED].index}-PK`]: LogRepository.tableRelations[SortType.CREATED].PK,
        [`${LogRepository.tableRelations[SortType.CREATED].index}-SK`]: log.createdAt,
        entityType: LogRepository.ROOT_ENTITY,
        ...logItem,
      };

      await this.putItem(logDocument);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findAll(logsParams?: LogParameters): Promise<LogPage> {
    try {
      const { Items, LastEvaluatedKey } = await this.query({
        IndexName: LogRepository.tableRelations[SortType.CREATED].index,
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': `${LogRepository.tableRelations[SortType.CREATED].index}-PK`,
        },
        ExpressionAttributeValues: {
          ':PK': LogRepository.tableRelations[SortType.CREATED].PK,
        },
        ScanIndexForward: false,
        Limit: logsParams?.limit ?? 10,
        ExclusiveStartKey: logsParams?.nextToken
          ? LogRepository.Base64ToObject(logsParams.nextToken) : undefined,
      });
      const logs = await Promise.all((Items as LogDocument[])?.map(
        async (item: LogDocument) => this.logFactory.toDomain(item),
      ));
      return {
        logs,
        nextToken: LastEvaluatedKey
          ? LogRepository.ObjectToBase64(LastEvaluatedKey) : undefined,
      };
    } catch (e) {
      console.log('[Log Repository]: ', e);
      this.Logger.error(e);
      throw e;
    }
  }

  private static Base64ToObject(payload: string) {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  }

  private static ObjectToBase64(payload: object) {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }
}
