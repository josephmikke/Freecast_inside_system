import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import databaseTableUtils from './database-table-utils';
import databaseLogTableUtils from './database-log-table-utils';

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
    // Drop main table
    const mainTableResult = await databaseTableUtils(client, 'fc-local-test', 'drop');
    console.log(mainTableResult ? 'Main table dropped successfully' : 'Failed to drop main table');

    // Drop log table
    const logTableResult = await databaseLogTableUtils(client, 'fc-local-log-test', 'drop');
    console.log(logTableResult ? 'Log table dropped successfully' : 'Failed to drop log table');
  } catch (error) {
    console.error('Error dropping tables:', error);
  }
})();