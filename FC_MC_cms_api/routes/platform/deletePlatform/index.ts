import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';
import errorHandler from 'routes/shared/middlewares/errorHandler';

import { DeletePlatformEvent } from '../../shared/dto/PlatformDto';
import { LogTrackAdaptor } from '../../shared/tracker/LogTrackAdaptor';
import PlatformMap from '../shared/PlatformMap';
import PlatformRepository from '../shared/PlatformRepository';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import DeletePlatformDomain from './DeletePlatformDomain';

const SERVICE_NAME = 'FreeCast-API-updatePlatform';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();

const platformMap = new PlatformMap(uid);
const ddbClient = new DynamoDBClient({});
const platformRepository = new PlatformRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  platformMap,
);
const lambdaClient = new LambdaClient({});
const logTracker = new LogTrackAdaptor(process.env.LOG_TRACK_ARN!, lambdaClient, logger);
const domain = new DeletePlatformDomain(platformRepository, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const deletePlatformHandler = async (event: DeletePlatformEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<DeletePlatformEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(deletePlatformHandler);
