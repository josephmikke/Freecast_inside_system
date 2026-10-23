import { APIGatewayClient } from '@aws-sdk/client-api-gateway';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser, { Event } from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';

import errorHandler from '../../shared/middlewares/errorHandler';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import ApiKeyAdaptor from './ApiKeyAdaptor';
import GetApiKeyDomain from './GetApiKeyDomain';

const SERVICE_NAME = 'FreeCast-API-getApiKey';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const apiGatewayClient = new APIGatewayClient({});
const apiKeyAdaptor = new ApiKeyAdaptor(apiGatewayClient);
const domain = new GetApiKeyDomain(apiKeyAdaptor);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const getApiKeyHandler = async (event: Event, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<Event>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(getApiKeyHandler);
