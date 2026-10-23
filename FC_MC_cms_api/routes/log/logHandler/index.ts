import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { injectLambdaContext, Logger } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler, Tracer } from '@aws-lambda-powertools/tracer';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import middy from '@middy/core';

import { TrackLogEvent } from '../../shared/dto/LogDto';
import LogFactory from '../shared/LogFactory';
import LogRepository from '../shared/LogRepository';

import TrackLogDomain from './TrackLogDomain';

const SERVICE_NAME = 'FreeCast-API-logHandler';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const factory = new LogFactory(uid);
const ddbClient = new DynamoDBClient({});
const logRepository = new LogRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  factory,
);
const domain = new TrackLogDomain(logRepository, factory);

const handler = async (event: TrackLogEvent, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  try {
    await domain.track(event);
    logger.info('Log added successfully');
    return {
      statusCode: 200,
      body: '',
    };
  } catch (err) {
    logger.error('Failed to add log', err);
    return {
      statusCode: 500,
      body: err.message,
    };
  }
};

export default middy(handler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
