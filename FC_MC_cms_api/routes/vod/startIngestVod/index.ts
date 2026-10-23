import { SFNClient } from '@aws-sdk/client-sfn';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { Context } from 'aws-lambda';

import { IngestVodEvent } from '../../shared/dto/vod/IngestDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import { StateMachineAdaptor } from '../shared/stateMachineAdaptor/StateMachineAdaptor';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import inputSchema from './assets/schema.json';
import IngestVodDomain from './IngestVodDomain';

const SERVICE_NAME = 'FreeCast-API-IngestVod';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const sfnClient = new SFNClient({});
const stateMachineAdaptor = new StateMachineAdaptor(
  sfnClient,
  process.env.VOD_STATE_MACHINE_ARN!,
);

const domain = new IngestVodDomain(stateMachineAdaptor);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const ingestVodHandler = async (event: IngestVodEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<IngestVodEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(ingestVodHandler);
