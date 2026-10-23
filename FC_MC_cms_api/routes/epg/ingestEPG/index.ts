import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';
import errorHandler from 'routes/shared/middlewares/errorHandler';

import EPGTemplateFactory from '../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../epgTemplate/shared/EPGTemplateRepository';
import { IngestEPGEvent } from '../../shared/dto/EPGDto';
import EPGFactory from '../shared/EPGFactory';
import EPGProgramBuilder from '../shared/EPGProgramBuilder';
import EPGRepository from '../shared/EPGRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import LambdaAdaptor from '../shared/lambda/LambdaAdaptor';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import IngestEPGDomain from './IngestEPGDomain';

const SERVICE_NAME = 'FreeCast-API-ingestEPG';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const epgBuilder = new EPGProgramBuilder(uid);
const ddbClient = new DynamoDBClient({});
const epgTemplateFactory = new EPGTemplateFactory(uid);
const epgTemplateRepository = new EPGTemplateRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  epgTemplateFactory,
);
const epgFactory = new EPGFactory(uid, epgTemplateRepository);
const epgRepository = new EPGRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  epgFactory,
  epgBuilder,
);
const lambdaInvoker = new LambdaAdaptor(new LambdaClient({}));

const domain = new IngestEPGDomain(epgRepository, lambdaInvoker, process.env.SCHEDULER_ARN!);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const ingestEPGHandler = async (event: IngestEPGEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<IngestEPGEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(ingestEPGHandler);
