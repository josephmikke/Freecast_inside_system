/*
* Be careful with reserved words for DynamoDB
* https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html
* */
import { Logger } from '@aws-lambda-powertools/logger';
import {
  Put,
  Update,
  Delete,
  DynamoDBClient,
  ConditionCheck,
} from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  TransactWriteCommand,
  BatchWriteCommand,
  DeleteCommand,
  DynamoDBDocument,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  QueryCommandInput,
  ScanCommand,
  ScanCommandInput,
  UpdateCommand,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { NativeAttributeValue } from '@aws-sdk/util-dynamodb';

interface Key {
  [key: string]: NativeAttributeValue
}

type TransactWriteItem = {
  ConditionCheck?: Omit<ConditionCheck, 'Key' | 'ExpressionAttributeValues' | 'TableName'> & {
    Key: Record<string, NativeAttributeValue> | undefined;
    ExpressionAttributeValues?: Record<string, NativeAttributeValue>;
  };
  Put?: Omit<Put, 'Item' | 'ExpressionAttributeValues' | 'TableName'> & {
    Item: Record<string, NativeAttributeValue> | undefined;
    ExpressionAttributeValues?: Record<string, NativeAttributeValue>;
  };
  Delete?: Omit<Delete, 'Key' | 'ExpressionAttributeValues' | 'TableName'> & {
    Key: Record<string, NativeAttributeValue> | undefined;
    ExpressionAttributeValues?: Record<string, NativeAttributeValue>;
  };
  Update?: Omit<Update, 'Key' | 'ExpressionAttributeValues' | 'TableName'> & {
    Key: Record<string, NativeAttributeValue> | undefined;
    ExpressionAttributeValues?: Record<string, NativeAttributeValue>;
  }
};

export interface ILogger {
  info(message: string): void;

  error(message: string): void;

  debug(message: string): void;

  warn(message: string): void;
}

/**
 * This is an abstract class with generic functions to interact with the database
 */
export class BaseRepository {
  private readonly logger: ILogger;

  private readonly client: DynamoDBClient;

  private readonly documentClient: DynamoDBDocumentClient;

  private readonly tableName: string;

  constructor(client: DynamoDBClient, tableName: string, logger: ILogger = new Logger({ serviceName: 'Repository' })) {
    this.logger = logger;
    this.client = client;
    this.documentClient = DynamoDBDocument.from(this.client, {
      marshallOptions: {
        convertEmptyValues: true,
        removeUndefinedValues: true,
      },
    });
    this.tableName = tableName;
  }

  get Logger() {
    return this.logger;
  }

  private static chunkArray(items: Array<Key>, chunkSize: number) {
    return items.reduce((resultArray: Array<Array<Key>>, item, index) => {
      const arrClone = [...resultArray];
      const chunkIndex = Math.floor(index / chunkSize);

      if (!arrClone[chunkIndex]) {
        arrClone[chunkIndex] = [];
      }
      arrClone[chunkIndex].push(item);
      return arrClone;
    }, []);
  }

  async updateItem(params: Omit<UpdateCommandInput, 'TableName'>) {
    try {
      const command = new UpdateCommand({ TableName: this.tableName, ...params });
      return await this.documentClient.send(command);
    } catch (err) {
      this.Logger.error(`can't update item in table '${this.tableName}'`);
      if (err instanceof Error) throw new Error(err.message);
      if (typeof err === 'string') throw new Error(err);
    }
  }

  async getItem(key: Key) {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: key,
      });
      return await this.documentClient.send(command);
    } catch (err) {
      this.Logger.error(`can't get item from table ${this.tableName}`);
      if (err instanceof Error) throw new Error(err.message);
      else throw new Error(err);
    }
  }

  async transactWriteItems(items: Array<TransactWriteItem>) {
    try {
      const batches = BaseRepository.chunkArray(items, 25);
      return await Promise.all(batches.map((batch) => {
        const command = new TransactWriteCommand({
          TransactItems: batch.map((item) => {
            const [[operation, { Item }]] = Object.entries(item);
            return ({
              [operation]: {
                Item,
                TableName: this.tableName,
              },
            });
          }),
        });
        return this.documentClient.send(command);
      }));
    } catch (err) {
      this.Logger.error(`can't write items into table ${this.tableName}`);
      if (err instanceof Error) throw new Error(err.message);
      else throw new Error(err);
    }
  }

  async batchGetItem(keys: Array<Key>) {
    try {
      const batches = BaseRepository.chunkArray(keys, 100);
      const responses = await Promise.all(batches.map(async (batch) => {
        const command = new BatchGetCommand({
          RequestItems: {
            [this.tableName]: {
              Keys: batch,
            },
          },
        });
        const { Responses } = await this.documentClient.send(command);
        return Responses ? Responses[this.tableName] : [];
      }));
      return responses.flat(2);
    } catch (err) {
      this.Logger.error(`can't batch get item from table ${this.tableName}`);
      console.log('keys: ', JSON.stringify(keys));
      if (err instanceof Error) throw new Error(err.message);
      else throw new Error(err);
    }
  }

  async batchWriteItem(items: Array<Key>, size?: number) {
    try {
      const batches = BaseRepository.chunkArray(items, size ?? 25);
      return await Promise.all(batches.map((batch) => {
        const command = new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: batch.map((item) => ({
              PutRequest: {
                Item: item,
              },
            })),
          },
        });
        return this.documentClient.send(command);
      }));
    } catch (err) {
      this.Logger.error(`can't write items into table ${this.tableName}`);
      if (err instanceof Error) throw new Error(err.message);
      else throw new Error(err);
    }
  }

  async deleteDocument(key: Key) {
    try {
      const command = new DeleteCommand({
        TableName: this.tableName,
        Key: key,
      });
      return await this.documentClient.send(command);
    } catch (err) {
      this.Logger.error(`can't delete items from table ${this.tableName}`);
      if (err instanceof Error) throw new Error(err.message);
      else throw new Error(err);
    }
  }

  async batchDeleteDocuments(keys: Array<Key>) {
    try {
      const batches = BaseRepository.chunkArray(keys, 25);
      return await Promise.all(batches.map((batch) => {
        const command = new BatchWriteCommand({
          RequestItems: {
            [this.tableName]: batch.map((key) => ({
              DeleteRequest: {
                Key: key,
              },
            })),
          },
        });
        return this.documentClient.send(command);
      }));
    } catch (err) {
      this.Logger.error(`can't delete items from table ${this.tableName}`);
      if (err instanceof Error) throw new Error(err.message);
      else throw new Error(err);
    }
  }

  async query(queryParams: Omit<QueryCommandInput, 'TableName'>) {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        ...queryParams,
      });
      return await this.documentClient.send(command);
    } catch (err) {
      this.Logger.error(`can't query item from table ${this.tableName}`);
      console.log('query params', queryParams);
      if (err instanceof Error) throw new Error(err.message);
      else throw new Error(err);
    }
  }

  async scan(queryParams?: Omit<ScanCommandInput, 'TableName'>) {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        ...queryParams,
      });
      return await this.documentClient.send(command);
    } catch (err) {
      this.Logger.error(`can't do a scan over '${this.tableName}'`);
      if (err instanceof Error) throw new Error(err.message);
      else throw new Error(err);
    }
  }

  async putItem(item: Key) {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: item,
      });
      return await this.documentClient.send(command);
    } catch (err) {
      this.Logger.error(`can't put a new item in table '${this.tableName}'`);
      throw new Error(err);
    }
  }
}
