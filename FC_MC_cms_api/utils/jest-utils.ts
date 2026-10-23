import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from './database-table-utils';

export const mockJestTimers = (date?: Date) => {
  const dateValue = date || new Date('2022-10-17');
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(dateValue);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  return dateValue.toISOString();
};

export const initDatabase = (tableName: string) => {
  const TEST_TABLE_NAME = tableName;
  const ddbClient = new DynamoDBClient({
    endpoint: 'http://localhost:8000',
    region: 'localhost',
    credentials: {
      accessKeyId: 'xxx',
      secretAccessKey: 'yyy',
    },
  });

  beforeEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  return {
    ddbClient,
    TEST_TABLE_NAME,
  };
};
