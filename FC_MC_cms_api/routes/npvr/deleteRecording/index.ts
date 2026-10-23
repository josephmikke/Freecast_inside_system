import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';
import errorHandler from 'routes/shared/middlewares/errorHandler';

import { SystemDeleteRecordingsEvent } from '../../shared/dto/RecordingDto';
import StorageAdaptor from '../../shared/StorageAdaptor';
import RecordingFactory from '../shared/RecordingFactory';
import RecordingRepository from '../shared/RecordingRepository';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import SystemDeleteRecordingsDomain from './SystemDeleteRecordingsDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const SERVICE_NAME = 'FreeCast-API-nPVR';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const ddbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));

const recordingFactory = new RecordingFactory();
const recordingRepository = new RecordingRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  recordingFactory,
);
const storageAdaptor = new StorageAdaptor(
  new S3Client({}),
  process.env.STORAGE_BUCKET!,
  new UIDGenerator(),
);
const domain = new SystemDeleteRecordingsDomain(recordingRepository, storageAdaptor);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const getRecordingsHandler = async (event: SystemDeleteRecordingsEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<SystemDeleteRecordingsEvent>()
  .use(captureLambdaHandler(tracer, { captureResponse: false }))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(getRecordingsHandler);
