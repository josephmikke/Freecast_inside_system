import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';

import { GetAutoIngestionEvent } from '../../shared/dto/AutoIngestionDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import createAutoIngestionDependencies from '../shared/AutoIngestionDependencies';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import GetAutoIngestionDomain from './GetAutoIngestionDomain';

const SERVICE_NAME = 'FreeCast-API-getAutoIngestion';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const { autoIngestionRepository } = createAutoIngestionDependencies(logger);
const domain = new GetAutoIngestionDomain(autoIngestionRepository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

export default middy<GetAutoIngestionEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler((event, context) => apiGatewayAdaptor.handler(event, context));
