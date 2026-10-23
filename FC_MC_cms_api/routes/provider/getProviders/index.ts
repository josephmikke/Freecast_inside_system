import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';
import errorHandler from 'routes/shared/middlewares/errorHandler';

import { AddProviderEvent } from '../../shared/dto/ProviderDto';
import ProviderMap from '../shared/ProviderMap';
import ProviderRepository from '../shared/ProviderRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import GetProvidersDomain from './GetProvidersDomain';

const SERVICE_NAME = 'FreeCast-API-getProviders';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const providerMap = new ProviderMap(uid);
const ddbClient = new DynamoDBClient({});
const providerRepository = new ProviderRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  providerMap,
);
const domain = new GetProvidersDomain(providerRepository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const getprovidersHandler = async (event: AddProviderEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<AddProviderEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(getprovidersHandler);
