import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const { CreateTableCommand, DeleteTableCommand } = require('@aws-sdk/client-dynamodb');

export default async (client: DynamoDBClient, tableName: string, action: 'create' | 'drop') => {
  const ACTIONS = {
    create: () => new CreateTableCommand({
      TableName: tableName,
      KeySchema: [
        { AttributeName: 'PK', KeyType: 'HASH' },
        { AttributeName: 'SK', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'PK', AttributeType: 'S' },
        { AttributeName: 'SK', AttributeType: 'S' },
        { AttributeName: 'GSI1-PK', AttributeType: 'S' },
        { AttributeName: 'GSI1-SK', AttributeType: 'S' },
        { AttributeName: 'GSI2-PK', AttributeType: 'S' },
        { AttributeName: 'GSI2-SK', AttributeType: 'S' },
        { AttributeName: 'GSI3-PK', AttributeType: 'S' },
        { AttributeName: 'GSI3-SK', AttributeType: 'S' },
      ],
      GlobalSecondaryIndexes: [{
        IndexName: 'GSI1',
        Projection: {
          ProjectionType: 'ALL',
        },
        KeySchema: [
          { AttributeName: 'GSI1-PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1-SK', KeyType: 'RANGE' },
        ],
      }, {
        IndexName: 'GSI2',
        Projection: {
          ProjectionType: 'ALL',
        },
        KeySchema: [
          { AttributeName: 'GSI2-PK', KeyType: 'HASH' },
          { AttributeName: 'GSI2-SK', KeyType: 'RANGE' },
        ],
      }, {
        IndexName: 'GSI3',
        Projection: {
          ProjectionType: 'ALL',
        },
        KeySchema: [
          { AttributeName: 'GSI3-PK', KeyType: 'HASH' },
          { AttributeName: 'GSI3-SK', KeyType: 'RANGE' },
        ],
      }],
      BillingMode: 'PAY_PER_REQUEST',
    }),
    drop: () => new DeleteTableCommand({
      TableName: tableName,
    }),
  };
  const usage = 'node drop-table.js <tableName> <create|drop>';

  if (!tableName || !action) throw new Error(`Missing arguments\nUsage: ${usage}`);

  try {
    await client.send(ACTIONS[action as keyof typeof ACTIONS]());

    return true;
  } catch (e) {
    return false;
  }
};
