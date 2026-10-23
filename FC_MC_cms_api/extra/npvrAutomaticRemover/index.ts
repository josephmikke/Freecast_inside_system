import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';

const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const s3 = new S3Client({});

const TABLE_NAME =
  process.env.TABLE_NAME ?? process.env.CMS_TABLE_NAME ?? 'cms-prod';
const GSI_NAME = process.env.GSI_NAME ?? 'GSI1';
const PK_PREFIX = process.env.PK_PREFIX ?? 'RECORDING';
const EXPIRY_MONTHS = parseInt(process.env.EXPIRY_MONTHS ?? '3', 10);
const EXPIRY_THRESHOLD_FORMAT = (
  process.env.EXPIRY_THRESHOLD_FORMAT ?? 'iso'
).toLowerCase();
const ROOT_ENTITY_TYPE = process.env.ROOT_ENTITY_TYPE ?? 'RECORDING';
const S3_BUCKET =
  process.env.S3_BUCKET ?? process.env.STORAGE_BUCKET ?? '';
const DYNAMO_BATCH_SIZE = 25;
const S3_BATCH_SIZE = 1000;

interface RecordingItem {
  PK: string;
  SK: string;
  entityType?: string;
  updatedAt?: string;
  destination?: { dash?: string; hls?: string };
}

function itemKey(item: RecordingItem): string {
  return `${item.PK}#${item.SK}`;
}

function getExpiryThreshold(): string {
  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() - EXPIRY_MONTHS);

  if (EXPIRY_THRESHOLD_FORMAT === 'legacy') {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return (
      `${threshold.getUTCFullYear()}-${pad(threshold.getUTCMonth() + 1)}-${pad(threshold.getUTCDate())} ` +
      `${pad(threshold.getUTCHours())}:${pad(threshold.getUTCMinutes())}:${pad(threshold.getUTCSeconds())}.` +
      `${threshold.getUTCMilliseconds().toString().padStart(3, '0')}0000`
    );
  }

  return threshold.toISOString();
}

function getS3PrefixFromItem(item: RecordingItem): string | null {
  try {
    const path = item.destination?.dash ?? item.destination?.hls ?? null;
    if (!path) return null;
    const parts = path.split('/').filter(Boolean);
    if (parts.length < 3) return null;
    return `${parts[0]}/${parts[1]}/${parts[2]}/`;
  } catch {
    return null;
  }
}

function findRootItem(items: RecordingItem[]): RecordingItem | null {
  const byType =
    items.find(
      (i) => i.entityType === ROOT_ENTITY_TYPE && i.PK === i.SK,
    ) ?? null;
  if (byType) return byType;
  return items.find((i) => i.PK === i.SK) ?? null;
}

async function deleteS3Assets(prefix: string): Promise<number> {
  let objectCount = 0;
  let continuationToken: string | undefined;

  do {
    const listParams: {
      Bucket: string;
      Prefix: string;
      ContinuationToken?: string;
    } = {
      Bucket: S3_BUCKET,
      Prefix: prefix,
    };
    if (continuationToken) listParams.ContinuationToken = continuationToken;

    const data: ListObjectsV2CommandOutput = await s3.send(
      new ListObjectsV2Command(listParams),
    );

    if (data.Contents && data.Contents.length > 0) {
      for (let i = 0; i < data.Contents.length; i += S3_BATCH_SIZE) {
        const batch = data.Contents.slice(i, i + S3_BATCH_SIZE);
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: S3_BUCKET,
            Delete: { Objects: batch.map((obj) => ({ Key: obj.Key! })) },
          }),
        );
        objectCount += batch.length;
      }
    }

    continuationToken = data.IsTruncated
      ? data.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objectCount;
}

async function batchDeleteItems(items: RecordingItem[]): Promise<number> {
  let deletedCount = 0;

  for (let i = 0; i < items.length; i += DYNAMO_BATCH_SIZE) {
    const batch = items.slice(i, i + DYNAMO_BATCH_SIZE);

    const params = {
      RequestItems: {
        [TABLE_NAME]: batch.map((item) => ({
          DeleteRequest: {
            Key: { PK: item.PK, SK: item.SK },
          },
        })),
      },
    };

    let response = await dynamoDB.send(new BatchWriteCommand(params));

    let retries = 0;

    while (
      response.UnprocessedItems &&
      response.UnprocessedItems[TABLE_NAME] &&
      response.UnprocessedItems[TABLE_NAME].length > 0
    ) {
      retries += 1;
      const delay = Math.min(1000 * 2 ** retries, 10000);
      console.log(
        `[RETRY] ${response.UnprocessedItems[TABLE_NAME]!.length} unprocessed items, retrying in ${delay}ms…`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));

      response = await dynamoDB.send(
        new BatchWriteCommand({ RequestItems: response.UnprocessedItems }),
      );
    }

    deletedCount += batch.length;
  }

  return deletedCount;
}

async function collectExpiredItems(): Promise<RecordingItem[]> {
  const threshold = getExpiryThreshold();
  console.log(`[SCAN] Looking for recordings updated before ${threshold}`);

  const expiredItems: RecordingItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  const baseParams = {
    TableName: TABLE_NAME,
    IndexName: GSI_NAME,
    KeyConditionExpression: '#pk = :pk',
    FilterExpression: '#updatedAt < :threshold',
    ExpressionAttributeNames: {
      '#pk': 'GSI1-PK',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':pk': PK_PREFIX,
      ':threshold': threshold,
    },
  };

  do {
    const result = await dynamoDB.send(
      new QueryCommand({
        ...baseParams,
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }),
    );
    const items = (result.Items ?? []) as RecordingItem[];
    expiredItems.push(...items);
    lastKey = result.LastEvaluatedKey;

    console.log(
      `[SCAN] Fetched ${items.length} expired rows (total so far: ${expiredItems.length})…`,
    );
  } while (lastKey);

  return expiredItems;
}

async function queryAllLinkedItems(pk: string): Promise<RecordingItem[]> {
  const all: RecordingItem[] = [];
  let lastKey: Record<string, unknown> | undefined;

  const baseParams = {
    TableName: TABLE_NAME,
    KeyConditionExpression: '#pk = :pkValue',
    ExpressionAttributeNames: { '#pk': 'PK' },
    ExpressionAttributeValues: { ':pkValue': pk },
  };

  do {
    const result = await dynamoDB.send(
      new QueryCommand({
        ...baseParams,
        ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
      }),
    );
    all.push(...((result.Items ?? []) as RecordingItem[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return all;
}

async function processExpiredRecordings(): Promise<{
  totalExpiredRows: number;
  totalDynamoDeleted: number;
  totalS3Deleted: number;
  recordingsS3Deleted: number;
  recordingsS3Skipped: number;
  errors: { pk: string; error: string }[];
}> {
  const expiredItems = await collectExpiredItems();

  if (expiredItems.length === 0) {
    return {
      totalExpiredRows: 0,
      totalDynamoDeleted: 0,
      totalS3Deleted: 0,
      recordingsS3Deleted: 0,
      recordingsS3Skipped: 0,
      errors: [],
    };
  }

  const byPk = new Map<string, Map<string, RecordingItem>>();
  for (const item of expiredItems) {
    const pk = item.PK;
    if (!byPk.has(pk)) byPk.set(pk, new Map());
    byPk.get(pk)!.set(itemKey(item), item);
  }

  let totalDynamoDeleted = 0;
  let totalS3Deleted = 0;
  let recordingsS3Deleted = 0;
  let recordingsS3Skipped = 0;
  const errors: { pk: string; error: string }[] = [];

  for (const [pk, keyMap] of byPk) {
    const itemsToDelete = [...keyMap.values()];
    const deleteKeys = new Set(itemsToDelete.map(itemKey));

    try {
      const linkedItems = await queryAllLinkedItems(pk);
      const remaining = linkedItems.filter((i) => !deleteKeys.has(itemKey(i)));

      const root =
        findRootItem(linkedItems) ?? findRootItem(itemsToDelete);
      const prefix = root ? getS3PrefixFromItem(root) : null;

      if (remaining.length > 0) {
        console.log(
          `[DDB] PK ${pk}: ${remaining.length} related row(s) still reference this recording — ` +
            `removing ${itemsToDelete.length} expired row(s) only, skipping S3`,
        );
        recordingsS3Skipped += 1;
      } else if (prefix) {
        const s3Count = await deleteS3Assets(prefix);
        totalS3Deleted += s3Count;
        recordingsS3Deleted += 1;
        console.log(
          `[S3] PK ${pk}: no related rows left — deleted ${s3Count} object(s) at s3://${S3_BUCKET}/${prefix}`,
        );
      } else {
        console.warn(
          `[S3] PK ${pk}: no related rows left but no destination path — skipping S3, deleting DDB only`,
        );
      }

      const deleted = await batchDeleteItems(itemsToDelete);
      totalDynamoDeleted += deleted;
      console.log(`[DDB] PK ${pk}: deleted ${deleted} expired row(s)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[ERROR] PK ${pk}: ${message}`);
      errors.push({ pk, error: message });
    }
  }

  return {
    totalExpiredRows: expiredItems.length,
    totalDynamoDeleted,
    totalS3Deleted,
    recordingsS3Deleted,
    recordingsS3Skipped,
    errors,
  };
}

export default async function handler(): Promise<{
  statusCode: number;
  body: unknown;
}> {
  console.log('[START] Expired recording cleanup Lambda invoked');

  if (!S3_BUCKET) {
    console.error('[FATAL] S3_BUCKET or STORAGE_BUCKET is not set');
    return {
      statusCode: 500,
      body: {
        message: 'Lambda misconfiguration',
        error: 'S3_BUCKET or STORAGE_BUCKET is required',
      },
    };
  }

  try {
    const {
      totalExpiredRows,
      totalDynamoDeleted,
      totalS3Deleted,
      recordingsS3Deleted,
      recordingsS3Skipped,
      errors,
    } = await processExpiredRecordings();

    if (totalExpiredRows === 0) {
      console.log('[DONE] No expired recordings found. Nothing to do.');
      return {
        statusCode: 200,
        body: { message: 'No expired recordings found', processed: 0 },
      };
    }

    const summary = {
      totalExpiredRows,
      totalDynamoDeleted,
      totalS3Deleted,
      recordingsS3Deleted,
      recordingsS3Skipped,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined,
    };

    console.log('[DONE] Summary:', JSON.stringify(summary, null, 2));

    return {
      statusCode: 200,
      body: summary,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[FATAL] Lambda execution failed:', error);
    return {
      statusCode: 500,
      body: { message: 'Lambda execution failed', error: message },
    };
  }
}
