/* eslint-disable @typescript-eslint/no-explicit-any */
// Types are loosened to `any` around aws-sdk-client-mock because its generic
// overloads don't line up with the @aws-sdk/lib-dynamodb document command
// types in this tree — a compile-time-only concern, the runtime mock is real.
import { mockClient } from 'aws-sdk-client-mock';

import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

type Handler = (event: any) => Promise<{ statusCode: number; body: string }>;

const ddbMock: any = mockClient(DynamoDBDocumentClient as any);

let handler: Handler;
let fetchMock: jest.Mock;

function snsEvent(distId: string, alarmName = 'CDN-4xx-alarm') {
  const message = JSON.stringify({
    AlarmName: alarmName,
    OldStateValue: 'OK',
    NewStateValue: 'ALARM',
    Trigger: {
      MetricName: '4xxErrorRate',
      Dimensions: [{ name: 'DistributionId', value: distId }],
    },
  });
  return { Records: [{ Sns: { Message: message } }] };
}

beforeAll(async () => {
  process.env.CMS_LOG_TABLE_NAME = 'cms-log';
  process.env.ALERT_COOLDOWN_SECONDS = '600';
  ({ default: handler } = await import('../index'));
});

beforeEach(() => {
  ddbMock.reset();
  fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
  (global as unknown as { fetch: jest.Mock }).fetch = fetchMock;
});

describe('cdn4xx5xxAlerts cooldown', () => {
  it('sends and records the cooldown timestamp on the first alarm', async () => {
    ddbMock.on(GetCommand).resolves({}); // no prior alert
    ddbMock.on(UpdateCommand).resolves({});

    await handler(snsEvent('E123ABC'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const updates = ddbMock.commandCalls(UpdateCommand);
    expect(updates).toHaveLength(1);
    expect(updates[0].args[0].input.Key).toEqual({
      PK: 'CDN-ALERT-COOLDOWN#E123ABC',
      SK: 'COOLDOWN',
    });
  });

  it('suppresses a repeat alarm that arrives within the cooldown window', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { lastAlertAt: new Date().toISOString() } });

    await handler(snsEvent('E123ABC'));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('sends again once the cooldown window has elapsed', async () => {
    const elevenMinAgo = new Date(Date.now() - 11 * 60 * 1000).toISOString();
    ddbMock.on(GetCommand).resolves({ Item: { lastAlertAt: elevenMinAgo } });
    ddbMock.on(UpdateCommand).resolves({});

    await handler(snsEvent('E123ABC'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(1);
  });

  it('tracks cooldown independently per DistributionId', async () => {
    ddbMock
      .on(GetCommand, { Key: { PK: 'CDN-ALERT-COOLDOWN#E-HOT', SK: 'COOLDOWN' } })
      .resolves({ Item: { lastAlertAt: new Date().toISOString() } });
    ddbMock
      .on(GetCommand, { Key: { PK: 'CDN-ALERT-COOLDOWN#E-COLD', SK: 'COOLDOWN' } })
      .resolves({});
    ddbMock.on(UpdateCommand).resolves({});

    await handler(snsEvent('E-HOT')); // suppressed
    await handler(snsEvent('E-COLD')); // sent

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails open and still alerts when the cooldown read errors', async () => {
    ddbMock.on(GetCommand).rejects(new Error('ddb unavailable'));
    ddbMock.on(UpdateCommand).resolves({});

    await handler(snsEvent('E123ABC'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
