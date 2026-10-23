import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';

import { UpdateAutoIngestionEvent } from '../../shared/dto/AutoIngestionDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import createAutoIngestionDependencies from '../shared/AutoIngestionDependencies';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import inputSchema from './assets/schema.json';
import UpdateAutoIngestionDomain from './UpdateAutoIngestionDomain';

const SERVICE_NAME = 'FreeCast-API-updateAutoIngestion';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const {
  autoIngestionFactory,
  autoIngestionRepository,
  logTracker,
  autoIngestionScheduler,
} = createAutoIngestionDependencies(logger);
const domain = new UpdateAutoIngestionDomain(
  autoIngestionRepository,
  autoIngestionFactory,
  autoIngestionScheduler,
  logTracker,
);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

export default middy<UpdateAutoIngestionEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler((event, context) => apiGatewayAdaptor.handler(event, context));
