import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import errorHandler from 'routes/shared/middlewares/errorHandler';

import { GetEPGTemplatesEvent } from '../../shared/dto/EPGTemplateDto';
import EPGTemplateFactory from '../shared/EPGTemplateFactory';
import EPGTemplateRepository from '../shared/EPGTemplateRepository';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import GetEPGTemplatesDomain from './GetEPGTemplatesDomain';

const SERVICE_NAME = 'FreeCast-API-getEPGTemplates';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const ddbClient = new DynamoDBClient({});
const epgTemplateFactory = new EPGTemplateFactory(uid);
const repository = new EPGTemplateRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  epgTemplateFactory,
);
const domain = new GetEPGTemplatesDomain(repository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const addEPGTemplateHandler = async (event: GetEPGTemplatesEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<GetEPGTemplatesEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(addEPGTemplateHandler);
