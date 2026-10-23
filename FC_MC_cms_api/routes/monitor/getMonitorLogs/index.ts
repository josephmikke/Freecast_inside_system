import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';

import { GetMonitorLogsEvent } from '../../shared/dto/MonitorLogDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import MonitorLogFactory from '../shared/MonitorLogFactory';
import MonitorLogRepository from '../shared/MonitorLogRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import GetMonitorLogsDomain from './GetMonitorLogsDomain';

const SERVICE_NAME = 'FreeCast-API-GetMonitorLogs';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const ddbClient = tracer.captureAWSv3Client(new DynamoDBClient({}));

const uid = new UIDGenerator();
const monitorLogFactory = new MonitorLogFactory(uid);
const repository = new MonitorLogRepository(
  ddbClient,
  process.env.CMS_LOG_TABLE_NAME!,
  monitorLogFactory,
);
const domain = new GetMonitorLogsDomain(repository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const getMonitorLogsHandler = async (event: GetMonitorLogsEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<GetMonitorLogsEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(getMonitorLogsHandler);