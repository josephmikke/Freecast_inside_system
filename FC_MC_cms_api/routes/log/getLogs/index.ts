import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import LogFactory from '../shared/LogFactory';
import { GetLogsEvent } from '../../shared/dto/LogDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import LogRepository from '../shared/LogRepository';

import GetLogsDomain from './GetLogsDomain';
import ApiGatewayAdaptor from './ApiGatewayAdaptor';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { injectLambdaContext, Logger } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler, Tracer } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import cors from '@middy/http-cors';
import { Context } from 'aws-lambda';

const SERVICE_NAME = 'FreeCast-API-getLogs';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const logFactory = new LogFactory(uid);
const ddbClient = new DynamoDBClient({});
const logRepository = new LogRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  logFactory,
);
const domain = new GetLogsDomain(logRepository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const getLogsHandler = async (event: GetLogsEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<GetLogsEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(getLogsHandler);
