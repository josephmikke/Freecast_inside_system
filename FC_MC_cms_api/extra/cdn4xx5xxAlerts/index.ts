import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

type AlarmDimension = {
  name?: string;
  Name?: string;
  value?: string;
  Value?: string;
};

type CloudWatchAlarmSnsPayload = {
  AlarmName?: string;
  AlarmDescription?: string;
  OldStateValue?: string;
  NewStateValue?: string;
  NewStateReason?: string;
  StateChangeTime?: string;
  AWSAccountId?: string;
  Trigger?: {
    MetricName?: string;
    Dimensions?: AlarmDimension[];
  };
};

type SnsRecord = {
  Sns?: {
    Message?: string;
  };
};

type SnsLambdaEvent = {
  Records?: SnsRecord[];
};

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL ?? '';

// Cooldown: the CloudWatch count alarm re-evaluates every 10-min window and can
// re-alarm every window while errors persist, with no suppression in between.
// We de-dupe per DistributionId by recording the last alert time in the shared
// `cms-log` table and skipping any alarm that arrives within the cooldown window.
const dynamoDB = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const COOLDOWN_TABLE_NAME = process.env.CMS_LOG_TABLE_NAME; // "cms-log"
const COOLDOWN_SORT_KEY = 'COOLDOWN';
const COOLDOWN_SECONDS = Number(process.env.ALERT_COOLDOWN_SECONDS ?? '600'); // 10 min
const COOLDOWN_MS = (Number.isFinite(COOLDOWN_SECONDS) ? COOLDOWN_SECONDS : 600) * 1000;

function cooldownPk(distId: string): string {
  return `CDN-ALERT-COOLDOWN#${distId}`;
}

function distributionId(alarm: CloudWatchAlarmSnsPayload): string {
  const dims = alarm.Trigger?.Dimensions ?? [];
  const d = dims.find((dim) => (dim.name ?? dim.Name) === 'DistributionId');
  return d?.value ?? d?.Value ?? 'N/A';
}

// Returns the epoch-ms of the last alert sent for this DistributionId, or 0 if
// none. Fails open (returns 0 → alert is sent) so a DynamoDB hiccup never
// silently swallows a real alert.
async function getLastAlertMs(distId: string): Promise<number> {
  if (!COOLDOWN_TABLE_NAME) return 0;
  try {
    const result = await dynamoDB.send(
      new GetCommand({
        TableName: COOLDOWN_TABLE_NAME,
        Key: { PK: cooldownPk(distId), SK: COOLDOWN_SORT_KEY },
      }),
    );
    const lastAlertAt = result.Item?.lastAlertAt as string | undefined;
    if (!lastAlertAt) return 0;
    const ms = new Date(lastAlertAt).getTime();
    return Number.isFinite(ms) ? ms : 0;
  } catch (e) {
    console.error(
      `[CDN-4xx-5xx-alerts] Failed to read cooldown for ${distId}; sending anyway:`,
      e,
    );
    return 0;
  }
}

// Records "now" as the last-alert time for this DistributionId. Called only
// after a successful Slack post. Failures are logged but swallowed — the alert
// already went out, so throwing here would trigger an SNS retry and a duplicate.
async function recordAlert(distId: string, alarmName: string): Promise<void> {
  if (!COOLDOWN_TABLE_NAME) return;
  const nowIso = new Date().toISOString();
  try {
    await dynamoDB.send(
      new UpdateCommand({
        TableName: COOLDOWN_TABLE_NAME,
        Key: { PK: cooldownPk(distId), SK: COOLDOWN_SORT_KEY },
        UpdateExpression:
          'SET #lastAlertAt = :lastAlertAt, #distributionId = :distributionId, #alarmName = :alarmName, #entityType = :entityType, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#lastAlertAt': 'lastAlertAt',
          '#distributionId': 'distributionId',
          '#alarmName': 'alarmName',
          '#entityType': 'entityType',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':lastAlertAt': nowIso,
          ':distributionId': distId,
          ':alarmName': alarmName,
          ':entityType': 'CdnAlertCooldown',
          ':updatedAt': nowIso,
        },
      }),
    );
  } catch (e) {
    console.error(
      `[CDN-4xx-5xx-alerts] Failed to record cooldown for ${distId}:`,
      e,
    );
  }
}

async function sendSlackNotification(message: unknown): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    console.error(
      '[CDN-4xx-5xx-alerts] Slack webhook URL is not set; skipping Slack POST',
    );
    return;
  }

  const res = await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(
      `Slack webhook failed: ${res.status} ${res.statusText} ${errBody}`,
    );
  }
  console.info('[CDN-4xx-5xx-alerts] Message posted to Slack');
}

function buildSlackMessage(alarm: CloudWatchAlarmSnsPayload): unknown {
  const alarmName = alarm.AlarmName ?? 'N/A';
  const description = alarm.AlarmDescription ?? 'N/A';
  const stateChange = `${alarm.OldStateValue ?? 'N/A'} -> ${alarm.NewStateValue ?? 'N/A'}`;
  const reason = alarm.NewStateReason ?? 'N/A';
  const timestamp = alarm.StateChangeTime ?? 'N/A';
  const metricName = alarm.Trigger?.MetricName ?? 'N/A';
  const distId = distributionId(alarm);
  const awsAccount = alarm.AWSAccountId ?? 'N/A';

  return {
    text: '🚨 *Broadcast CloudFront Alarm Notification* 🚨',
    attachments: [
      {
        color: 'danger',
        fields: [
          { title: 'Alarm Name', value: alarmName, short: true },
          { title: 'Description', value: description, short: false },
          { title: 'State Change', value: stateChange, short: true },
          { title: 'Reason', value: reason, short: false },
          { title: 'Timestamp', value: timestamp, short: true },
          { title: 'Metric Name', value: metricName, short: true },
          { title: 'Distribution ID', value: distId, short: true },
          { title: 'AWS Account', value: awsAccount, short: true },
        ],
        footer: 'AWS CloudWatch Alarm',
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

async function processRecord(record: SnsRecord): Promise<void> {
  const raw = record.Sns?.Message;
  if (!raw) {
    console.warn('[CDN-4xx-5xx-alerts] Record missing Sns.Message');
    return;
  }

  let alarm: CloudWatchAlarmSnsPayload;
  try {
    alarm = JSON.parse(raw) as CloudWatchAlarmSnsPayload;
  } catch (e) {
    console.error('[CDN-4xx-5xx-alerts] SNS message is not JSON:', raw.slice(0, 500));
    throw e;
  }

  const distId = distributionId(alarm);
  const lastAlertMs = await getLastAlertMs(distId);
  const sinceMs = Date.now() - lastAlertMs;
  if (lastAlertMs > 0 && sinceMs < COOLDOWN_MS) {
    console.info(
      `[CDN-4xx-5xx-alerts] Cooldown active for ${distId} (${Math.round(
        sinceMs / 1000,
      )}s / ${COOLDOWN_MS / 1000}s since last alert); skipping Slack POST`,
    );
    return;
  }

  await sendSlackNotification(buildSlackMessage(alarm));
  await recordAlert(distId, alarm.AlarmName ?? 'N/A');
}

export default async function handler(
  event: SnsLambdaEvent,
): Promise<{ statusCode: number; body: string }> {
  console.log(`Received event: ${JSON.stringify(event)}`);

  const records = event.Records ?? [];
  await Promise.all(records.map((record) => processRecord(record)));

  return {
    statusCode: 200,
    body: JSON.stringify('Lambda function executed successfully!'),
  };
}
