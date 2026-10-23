import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';

import { DeleteAutoIngestionEvent } from '../../shared/dto/AutoIngestionDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import createAutoIngestionDependencies from '../shared/AutoIngestionDependencies';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import DeleteAutoIngestionDomain from './DeleteAutoIngestionDomain';

const SERVICE_NAME = 'FreeCast-API-deleteAutoIngestion';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const { autoIngestionRepository, logTracker, autoIngestionScheduler } = createAutoIngestionDependencies(logger);
const domain = new DeleteAutoIngestionDomain(
  autoIngestionRepository,
  autoIngestionScheduler,
  logTracker,
);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

export default middy<DeleteAutoIngestionEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler((event, context) => apiGatewayAdaptor.handler(event, context));
