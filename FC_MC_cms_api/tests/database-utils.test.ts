import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBUtils from '../utils/database-table-utils';

describe('Database table utils', () => {
  const client = new DynamoDBClient({
    endpoint: 'http://localhost:8000',
    region: 'localhost',
    credentials: {
      accessKeyId: 'xxx',
      secretAccessKey: 'yyy',
    },
  });

  it('should create a DynamoDB table', async () => {
    const result = await DynamoDBUtils(client, 'dev-fc-epg-jest', 'create');
    await expect(result).toEqual(true);
  });

  it('should drop a DynamoDB table', async () => {
    const result = await DynamoDBUtils(client, 'dev-fc-epg-jest', 'drop');
    await expect(result).toEqual(true);
  });

  it('should throw an error if missing table name or action', async () => {
    await expect(async () => DynamoDBUtils(client, '', 'drop')).rejects.toThrow();
  });

  it('should return false if action does not exist', async () => {
    // @ts-ignore
    expect(await DynamoDBUtils(client, 'dev-fc-epg-jest', 'doesnotexist')).toBeFalsy();
  });
});
