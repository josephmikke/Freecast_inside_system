import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';

const LOCAL_TABLE_NAME = 'fc-local-log-test'; // Your local table name

const importData = async () => {
  const dynamodb = new DynamoDB({
    endpoint: 'http://localhost:8000',
    region: 'localhost',
    credentials: {
      accessKeyId: 'xxx',
      secretAccessKey: 'yyy',
    },
  });

  const docClient = DynamoDBDocument.from(dynamodb);

  try {
    console.log('Reading export file...');
    const items = JSON.parse(fs.readFileSync('./table-data-export.json', 'utf-8'));

    console.log(`Starting import of ${items.length} items to ${LOCAL_TABLE_NAME}...`);

    // Import in batches of 25 (DynamoDB batch write limit)
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);

      const params = {
        RequestItems: {
          [LOCAL_TABLE_NAME]: batch.map((item: any) => ({
            PutRequest: {
              Item: item
            }
          }))
        }
      };

      await docClient.batchWrite(params);
      console.log(`Imported items ${i + 1} to ${Math.min(i + 25, items.length)}`);
    }

    console.log('Import complete!');
  } catch (error) {
    console.error('Import failed:', error);
  }
};

importData();