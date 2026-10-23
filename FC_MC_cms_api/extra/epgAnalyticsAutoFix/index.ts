import {
  InvokeCommand,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';

const lambdaClient = new LambdaClient({});
const snsClient = new SNSClient({});

const EPG_VALIDATION_LAMBDA_FUNCTION =
  process.env.EPG_VALIDATION_LAMBDA_FUNCTION ?? 'epg-validation-lambda';
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const MAX_ERRORS_THRESHOLD = parseInt(
  process.env.MAX_ERRORS_THRESHOLD ?? '1',
  10,
);
const MAX_GAPS_THRESHOLD = parseInt(
  process.env.MAX_GAPS_THRESHOLD ?? '1',
  10,
);

type ValidationSection = {
  isValid: boolean;
  totalPrograms?: number;
  errors?: string[];
  timeOverlaps?: unknown[];
  timeGaps?: unknown[];
};

type ValidationResult = {
  epgId: string;
  epgName: string;
  wasRepaired?: boolean;
  validation: ValidationSection;
};

type ValidationSummary = {
  totalPrograms: number;
  totalErrors: number;
  totalWarnings: number;
  totalTimeGaps: number;
  totalTimeOverlaps: number;
};

type ValidationResponse = {
  totalEPGs: number;
  validEPGs: number;
  invalidEPGs: number;
  repairedEPGs: number;
  summary: ValidationSummary;
  results: ValidationResult[];
};

function toIsoUtc(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function createResponse(statusCode: number, body: unknown): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

async function callEpgValidationLambda(
  filterParams: Record<string, string> = {},
): Promise<ValidationResponse> {
  console.log(
    `[INFO] Calling EPG validation Lambda with filters: ${JSON.stringify(filterParams)}`,
  );

  const now = new Date();
  const start = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const startTime = toIsoUtc(start);
  const endTime = toIsoUtc(end);

  console.log(`[INFO] Time range: ${startTime} to ${endTime}`);

  const payload = {
    queryStringParameters: {
      startTime,
      endTime,
      autoRepair: 'true',
      ...filterParams,
    },
  };

  const response = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: EPG_VALIDATION_LAMBDA_FUNCTION,
      InvocationType: 'RequestResponse',
      Payload: Buffer.from(JSON.stringify(payload)),
    }),
  );

  if (response.StatusCode !== 200) {
    throw new Error(
      `EPG validation Lambda returned status code: ${String(response.StatusCode)}`,
    );
  }

  if (response.FunctionError) {
    throw new Error(`EPG validation Lambda function error: ${response.FunctionError}`);
  }

  const payloadString = response.Payload
    ? Buffer.from(response.Payload).toString('utf-8')
    : '{}';
  const responsePayload = JSON.parse(payloadString) as Record<string, unknown>;

  let validationData: unknown = responsePayload;
  if ('body' in responsePayload) {
    const body = responsePayload.body;
    validationData =
      typeof body === 'string' ? JSON.parse(body) : body;
  }

  console.log(`[INFO] EPG validation response: ${JSON.stringify(validationData)}`);

  return validationData as ValidationResponse;
}

function analyzeErrorCategories(results: ValidationResult[]): Record<string, number> {
  const categories = {
    time_overlaps: 0,
    time_gaps: 0,
    missing_titles: 0,
    invalid_durations: 0,
    empty_epgs: 0,
    other_errors: 0,
  };

  for (const result of results) {
    const validation = result.validation;
    categories.time_overlaps += validation.timeOverlaps?.length ?? 0;
    categories.time_gaps += validation.timeGaps?.length ?? 0;

    for (const err of validation.errors ?? []) {
      const errorLower = err.toLowerCase();
      if (errorLower.includes('overlap')) continue;
      if (errorLower.includes('missing title')) {
        categories.missing_titles += 1;
      } else if (errorLower.includes('invalid program duration')) {
        categories.invalid_durations += 1;
      } else if (errorLower.includes('no programs found')) {
        categories.empty_epgs += 1;
      } else {
        categories.other_errors += 1;
      }
    }
  }

  return categories;
}

function identifyCriticalEpgs(results: ValidationResult[]): Array<Record<string, unknown>> {
  const critical: Array<Record<string, unknown>> = [];

  for (const result of results) {
    const validation = result.validation;
    const errorCount = validation.errors?.length ?? 0;
    const overlapCount = validation.timeOverlaps?.length ?? 0;
    const gapCount = validation.timeGaps?.length ?? 0;
    const totalPrograms = validation.totalPrograms ?? 0;

    const isCritical =
      errorCount >= MAX_ERRORS_THRESHOLD ||
      overlapCount >= 1 ||
      gapCount >= MAX_GAPS_THRESHOLD ||
      totalPrograms === 0;

    if (isCritical) {
      critical.push({
        epg_id: result.epgId,
        epg_name: result.epgName,
        error_count: errorCount,
        overlap_count: overlapCount,
        gap_count: gapCount,
        total_programs: totalPrograms,
      });
    }
  }

  return critical;
}

function generateRecommendations(
  results: ValidationResult[],
  summary: ValidationSummary,
  totalEpgs: number,
): string[] {
  const recommendations: string[] = [];

  if (totalEpgs === 0) {
    return [
      'Please solve - no EPG was validated. No enabled channel has EPG data for the '
      + 'validated time range',
    ];
  }

  if (summary.totalTimeOverlaps > 0) {
    recommendations.push('Fix time overlaps immediately - they cause viewing disruptions');
  }
  if (summary.totalTimeGaps > summary.totalPrograms * 0.1) {
    recommendations.push('Review EPG data source for frequent time gaps');
  }
  if (summary.totalErrors > summary.totalPrograms * 0.05) {
    recommendations.push('Investigate EPG data quality issues');
  }

  const emptyEpgs = results.filter((r) => (r.validation.totalPrograms ?? 0) === 0).length;
  if (emptyEpgs > 0) {
    recommendations.push(
      `Please solve - no program data available in source ${String(emptyEpgs)} url(s)`,
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('EPG data quality is good - maintain current processes');
  }

  return recommendations;
}

function analyzeValidationResults(validationResponse: ValidationResponse): Record<string, unknown> {
  const { summary, results } = validationResponse;

  return {
    total_epgs: validationResponse.totalEPGs,
    valid_epgs: validationResponse.validEPGs,
    invalid_epgs: validationResponse.invalidEPGs,
    repaired_epgs: validationResponse.repairedEPGs,
    total_programs: summary.totalPrograms,
    total_errors: summary.totalErrors,
    total_warnings: summary.totalWarnings,
    total_time_gaps: summary.totalTimeGaps,
    total_time_overlaps: summary.totalTimeOverlaps,
    error_categories: analyzeErrorCategories(results),
    critical_epgs: identifyCriticalEpgs(results),
    recommendations: generateRecommendations(results, summary, validationResponse.totalEPGs),
  };
}

function processInvalidEpgs(results: ValidationResult[]): {
  processed: number;
  fixed: number;
  failed: number;
} {
  const invalid = results.filter((r) => !r.validation.isValid);
  // A repair only counts as fixed when program data actually exists afterwards.
  // An EPG left with no program data (empty source) is still broken, so it counts as failed
  // even though repairEPG did not throw.
  const repaired = invalid.filter(
    (r) => r.wasRepaired && (r.validation.totalPrograms ?? 0) > 0,
  );

  return {
    processed: invalid.length,
    fixed: repaired.length,
    failed: invalid.length - repaired.length,
  };
}

function createNotificationMessage(
  analytics: Record<string, unknown>,
  fixResults: { processed: number; fixed: number; failed: number },
): string {
  const criticalEpgs = (analytics.critical_epgs as Array<Record<string, unknown>> | undefined) ?? [];
  const recommendations = (analytics.recommendations as string[] | undefined) ?? [];

  let message = `EPG Analytics Report

SUMMARY:
- Total EPGs: ${String(analytics.total_epgs)}
- Valid EPGs: ${String(analytics.valid_epgs)}
- Invalid EPGs: ${String(analytics.invalid_epgs)}

ISSUES:
- Total Errors: ${String(analytics.total_errors)}
- Time Overlaps: ${String(analytics.total_time_overlaps)}
- Time Gaps: ${String(analytics.total_time_gaps)}

CRITICAL EPGs: ${String(criticalEpgs.length)}
`;

  for (const epg of criticalEpgs.slice(0, 5)) {
    message += `- ${String(epg.epg_name)} (ID: ${String(epg.epg_id)})\n`;
  }

  message += `
FIX ATTEMPTS:
- Processed: ${fixResults.processed}
- Fixed: ${fixResults.fixed}
- Failed: ${fixResults.failed}

RECOMMENDATIONS:
`;

  for (const rec of recommendations) {
    message += `- ${rec}\n`;
  }

  return message;
}

async function sendNotifications(
  analytics: Record<string, unknown>,
  fixResults: { processed: number; fixed: number; failed: number },
): Promise<void> {
  if (!SNS_TOPIC_ARN) {
    console.log('[INFO] No SNS topic configured, skipping notifications');
    return;
  }

  const criticalCount = ((analytics.critical_epgs as unknown[]) ?? []).length;
  const totalEpgs = Number(analytics.total_epgs ?? 0);

  // No EPG at all is an alert on its own: nothing was validated, so no issue can be reported.
  if (criticalCount <= 0 && totalEpgs > 0) return;

  const subject = totalEpgs === 0
    ? 'EPG Analytics Alert - No EPG validated. Please check source epgs'
    : `EPG Analytics Alert - ${String(criticalCount)} Critical Issues`;

  const message = createNotificationMessage(analytics, fixResults);
  await snsClient.send(
    new PublishCommand({
      TopicArn: SNS_TOPIC_ARN,
      Subject: subject,
      Message: message,
    }),
  );
}

type LambdaEvent = {
  filter?: Record<string, string>;
};

export default async function handler(event: LambdaEvent): Promise<{
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}> {
  try {
    console.log(`[INFO] Starting EPG analytics process with event: ${JSON.stringify(event)}`);

    const filterParams = event?.filter ?? {};
    const validationResponse = await callEpgValidationLambda(filterParams);
    const analyticsResult = analyzeValidationResults(validationResponse);
    const fixResults = processInvalidEpgs(validationResponse.results);

    await sendNotifications(analyticsResult, fixResults);

    return createResponse(200, {
      analytics: analyticsResult,
      validation_summary: validationResponse.summary,
      fix_results: fixResults,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[ERROR] EPG analytics process failed:', error);
    return createResponse(500, `Internal server error: ${message}`);
  }
}
