import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import * as fs from 'fs';

const PROD_TABLE_NAME = 'cms-log'; // Your production table name

const exportData = async () => {
  const dynamodb = new DynamoDB({
    region: 'us-east-1', // Your production region
    credentials: {
      accessKeyId: 'xxxxx',
      secretAccessKey: 'yyyyy',
    },
  });

  const docClient = DynamoDBDocument.from(dynamodb);

  try {
    console.log(`Starting export from ${PROD_TABLE_NAME}...`);

    const items: any[] = [];
    let lastEvaluatedKey: any = undefined;

    do {
      const params = {
        TableName: PROD_TABLE_NAME,
        Limit: 1000,
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const response = await docClient.scan(params);
      items.push(...(response.Items || []));
      lastEvaluatedKey = response.LastEvaluatedKey;

      console.log(`Exported ${items.length} items so far...`);
    } while (lastEvaluatedKey);

    // Save to file
    fs.writeFileSync(
      './table-data-export.json',
      JSON.stringify(items, null, 2)
    );

    console.log(`Export complete. ${items.length} items saved to table-data-export.json`);
  } catch (error) {
    console.error('Export failed:', error);
  }
};

exportData();