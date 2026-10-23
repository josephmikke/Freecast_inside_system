import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';

import { AddAutoIngestionEvent } from '../../shared/dto/AutoIngestionDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import createAutoIngestionDependencies from '../shared/AutoIngestionDependencies';

import AddAutoIngestionDomain from './AddAutoIngestionDomain';
import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import inputSchema from './assets/schema.json';

const SERVICE_NAME = 'FreeCast-API-addAutoIngestion';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const {
  autoIngestionFactory,
  autoIngestionRepository,
  logTracker,
  autoIngestionScheduler,
} = createAutoIngestionDependencies(logger);
const domain = new AddAutoIngestionDomain(
  autoIngestionRepository,
  autoIngestionFactory,
  autoIngestionScheduler,
  logTracker,
);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

export default middy<AddAutoIngestionEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors({
    exposeHeaders: 'Location',
  }))
  .use(errorHandler)
  .handler((event, context) => apiGatewayAdaptor.handler(event, context));
