import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { MediaPackageClient } from '@aws-sdk/client-mediapackage';
import { SchedulerClient } from '@aws-sdk/client-scheduler';

import { injectLambdaContext, Logger } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler, Tracer } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import { Context, EventBridgeEvent } from 'aws-lambda';

import { RecordingEvent } from '../../shared/dto/RecordingDto';
import OneTimeScheduleAdaptor from '../../shared/scheduler/OneTimeScheduleAdaptor';
import RecorderAdaptor from '../shared/RecorderAdaptor';
import RecordingFactory from '../shared/RecordingFactory';
import RecordingRepository from '../shared/RecordingRepository';

import EventBridgeAdaptor from './EventBridgeAdaptor';
import RecorderDomain from './RecorderDomain';

const SERVICE_NAME = 'FreeCast-API-nPVR';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const mpClient = tracer.captureAWSv3Client(new MediaPackageClient({}));
const ddbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));

const recorderAdaptor = new RecorderAdaptor(mpClient);
const recordingFactory = new RecordingFactory();
const recordingRepository = new RecordingRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  recordingFactory,
);
const oneTimeScheduler = new OneTimeScheduleAdaptor(new SchedulerClient({}));
const domain = new RecorderDomain(recordingRepository, recorderAdaptor, oneTimeScheduler);
const eventBridgeAdaptor = new EventBridgeAdaptor(domain);

const handler = async (event: EventBridgeEvent<string,
RecordingEvent>, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return eventBridgeAdaptor.handler(event, context);
};

export default middy(handler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
