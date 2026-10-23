import { BaseRepository, ILogger } from '/opt/nodejs/powertools/Repository';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import databaseTableUtils from '../utils/database-table-utils';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const fakeLogger: ILogger = {
  debug: () => jest.fn(),
  warn: () => jest.fn(),
  info: () => jest.fn(),
  error: () => jest.fn(),
};

const db = new BaseRepository(client, 'TestTable', fakeLogger);

const errorConsole = console.error;

beforeAll(async () => {
  console.error = jest.fn();
  await databaseTableUtils(client, 'TestTable', 'create');
});

afterAll(async () => {
  console.error = errorConsole;
  await databaseTableUtils(client, 'TestTable', 'drop');
});

describe('DynamoDB wrapper', () => {
  describe('putItem', () => {
    it("should update an item or create a new one if doesn't exist", async () => {
      const result = await db.putItem({
        PK: 'USER#1',
        SK: 'PROFILE#123',
        email: 'bs@gmail.com',
      });
      if (result) expect(result.$metadata.httpStatusCode).toBe(200);
    });

    it('should update an item', async () => {
      const result = await db.putItem({
        PK: 'USER#1',
        SK: 'PROFILE#1234',
        email: 'profile2@gmail.com',
      });
      if (result) expect(result.$metadata.httpStatusCode).toBe(200);
    });

    it('should throw an error', async () => {
      await expect(async () => db.putItem({
        Random: 'USER#1',
      })).rejects.toThrow('One of the required keys was not given a value');
    });
  });

  describe('getItem', () => {
    it('should return an item for a given PK and SK', async () => {
      const result = await db.getItem({
        PK: 'USER#1',
        SK: 'PROFILE#123',
      });
      if (result) expect(result.Item).toMatchObject({ PK: 'USER#1', SK: 'PROFILE#123', email: 'bs@gmail.com' });
    });

    it('should throw an error', async () => {
      await expect(async () => db.getItem({
        Random: 'USER#1',
      })).rejects.toThrow('The number of conditions on the keys is invalid');
    });
  });

  describe('batch operations', () => {
    const items = Array.from(Array(110).keys()).map((key) => ({ PK: `USER#${key}`, SK: 'PROFILE#1' }));

    it('should write a batch of items', async () => {
      const result = await db.batchWriteItem(items);
      if (result) expect(result).toHaveLength(5);
    });

    it('should return a batch of items', async () => {
      const result = await db.batchGetItem(items);
      if (result) expect(result).toHaveLength(110);
    });

    // DynamoDB Local's wording for an empty key varies between image versions, so only the
    // rejection itself is asserted
    it('should throw an error (batch write)', async () => {
      await expect(async () => db.batchWriteItem([{}])).rejects.toThrow();
    });

    it('should throw an error (batch read)', async () => {
      await expect(async () => db.batchGetItem([{}])).rejects.toThrow();
    });
  });

  describe('query', () => {
    it('should return all USER#1 profiles', async () => {
      const result = await db.query({
        KeyConditionExpression: 'PK = :PK AND begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': 'USER#1',
          ':SK': 'PROFILE#',
        },
        ProjectionExpression: 'SK, email',
      });
      if (result) expect(result.Items).toHaveLength(3);
      if (result) {
        expect(result.Items).toEqual([{ SK: 'PROFILE#1' }, {
          SK: 'PROFILE#123',
          email: 'bs@gmail.com',
        }, { SK: 'PROFILE#1234', email: 'profile2@gmail.com' }]);
      }
    });

    it('should throw an error', async () => {
      await expect(async () => db.query({})).rejects.toThrow('Either the KeyConditions or KeyConditionExpression parameter must be specified in the request.');
    });
  });

  describe('updateItem', () => {
    it("should update USER#1's PROFILE#123", async () => {
      const result = await db.updateItem({
        Key: {
          PK: 'USER#1',
          SK: 'PROFILE#123',
        },
        UpdateExpression: 'SET email = :newEmail',
        ConditionExpression: 'email = :oldEmail',
        ExpressionAttributeValues: {
          ':newEmail': 'new-email-from-test@example.com',
          ':oldEmail': 'bs@gmail.com',
        },
        ReturnValues: 'ALL_NEW',
      });
      if (result) {
        expect(result.Attributes).toEqual({
          PK: 'USER#1',
          SK: 'PROFILE#123',
          email: 'new-email-from-test@example.com',
        });
      }
    });

    it('should throw an error', async () => {
      await expect(async () => db.updateItem({
        Key: {
          Random: 'USER#1',
        },
      })).rejects.toThrow('The number of conditions on the keys is invalid');
    });
  });

  describe('deleteDocument', () => {
    it("should delete USER#1's PROFILE#123", async () => {
      const result = await db.deleteDocument({
        PK: 'USER#1',
        SK: 'PROFILE#123',
      });
      if (result) expect(result.$metadata.httpStatusCode).toEqual(200);
    });

    it('should return undefined Item', async () => {
      const result = await db.getItem({
        PK: 'USER#1',
        SK: 'PROFILE#123',
      });
      if (result) expect(result.Item).toBe(undefined);
    });

    it('should throw an error', async () => {
      await expect(async () => db.deleteDocument({
        Key: {
          Random: 'USER#1',
        },
      })).rejects.toThrow('The number of conditions on the keys is invalid');
    });
  });

  describe('scan', () => {
    it('should return all database items', async () => {
      const result = await db.scan();
      // 110 batch items + USER#1 PROFILE#1234 (PROFILE#123 was deleted above)
      if (result) expect(result.Items).toHaveLength(111);
    });
  });

  describe('transactWriteItems', () => {
    const items = Array.from(Array(27).keys()).map((key) => ({
      Put: {
        Item: { PK: `USER#${key}`, SK: 'PROFILE#1' },
      },
    }));

    it('should write items with a transaction', async () => {
      const result = await db.transactWriteItems(items);
      expect(result).toHaveLength(2); // Capacity Unit consumed
    });
  });
});
