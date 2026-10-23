import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SFNClient } from '@aws-sdk/client-sfn';

import { injectLambdaContext, Logger } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler, Tracer } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';

import { StateMachineAdaptor } from '../../vod/shared/stateMachineAdaptor/StateMachineAdaptor';
import IngestionFactory from '../../vod/ingestion/shared/IngestionFactory';
import IngestionRepository from '../../vod/ingestion/shared/IngestionRepository';
import createAutoIngestionDependencies from '../shared/AutoIngestionDependencies';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import RunAutoIngestionDomain from './RunAutoIngestionDomain';

const SERVICE_NAME = 'FreeCast-API-autoIngestionScheduleHandler';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const ddbClient = new DynamoDBClient({});
const { autoIngestionRepository } = createAutoIngestionDependencies(logger);
const ingestionRepository = new IngestionRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  new IngestionFactory(uid),
);
const stateMachineAdaptor = new StateMachineAdaptor(
  new SFNClient({}),
  process.env.VOD_STATE_MACHINE_ARN!,
);
const domain = new RunAutoIngestionDomain(
  autoIngestionRepository,
  ingestionRepository,
  new IngestionFactory(uid),
  stateMachineAdaptor,
  uid,
);

const handler = async (event: { autoIngestionId: string }, context: { callbackWaitsForEmptyEventLoop: boolean }) => {
  context.callbackWaitsForEmptyEventLoop = false;
  logger.info('Start auto ingestion', { autoIngestionId: event.autoIngestionId });
  try {
    await domain.run(event.autoIngestionId);
    logger.info('Auto ingestion started');
    return { statusCode: 200, body: '' };
  } catch (e) {
    logger.error('Auto ingestion failed', e);
    return { statusCode: 500, body: (e as Error).message };
  }
};

export default middy(handler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
