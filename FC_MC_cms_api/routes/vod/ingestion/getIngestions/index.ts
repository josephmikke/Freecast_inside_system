import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';

import { GetIngestionsEvent } from '../../../shared/dto/vod/IngestDto';
import errorHandler from '../../../shared/middlewares/errorHandler';
import IngestionFactory from '../shared/IngestionFactory';
import IngestionRepository from '../shared/IngestionRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import GetIngestionsDomain from './GetIngestionsDomain';

const SERVICE_NAME = 'FreeCast-API-GetIngestions';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const ddbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));

const uid = new UIDGenerator();

const ingestionFactory = new IngestionFactory(uid);
const ingestionRepository = new IngestionRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  ingestionFactory,
);
const domain = new GetIngestionsDomain(ingestionRepository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const getIngestionHandler = async (event: GetIngestionsEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<GetIngestionsEvent>()
  .use(captureLambdaHandler(tracer, { captureResponse: false }))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(getIngestionHandler);
