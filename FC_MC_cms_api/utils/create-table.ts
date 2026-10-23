import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import databaseTableUtils from './database-table-utils';
import databaseLogTableUtils from './database-table-utils';

(async () => {
  const client = new DynamoDBClient({
    endpoint: 'http://localhost:8000',
    region: 'localhost',
    credentials: {
      accessKeyId: 'xxx',
      secretAccessKey: 'yyy',
    },
  });

  try {
    // Create main table
    const mainTableResult = await databaseTableUtils(client, 'fc-local-test', 'create');
    console.log(mainTableResult ? 'Main table created successfully' : 'Failed to create main table');

    // Create log table
    const logTableResult = await databaseLogTableUtils(client, 'fc-local-log-test', 'create');
    console.log(logTableResult ? 'Log table created successfully' : 'Failed to create log table');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
})();
