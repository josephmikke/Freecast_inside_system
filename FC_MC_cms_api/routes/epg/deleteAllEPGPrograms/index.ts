import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';

import { injectLambdaContext, Logger } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler, Tracer } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';

import EPGTemplateFactory from '../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../epgTemplate/shared/EPGTemplateRepository';
import { DeleteAllEPGProgramEvent } from '../../shared/dto/EPGDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import StorageAdaptor from '../../shared/StorageAdaptor';
import { LogTrackAdaptor } from '../../shared/tracker/LogTrackAdaptor';
import EPGFactory from '../shared/EPGFactory';
import EPGProgramBuilder from '../shared/EPGProgramBuilder';
import EPGRepository from '../shared/EPGRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import DeleteAllEPGProgramsDomain from './DeleteAllEPGProgramsDomain';

const SERVICE_NAME = 'FreeCast-API-deleteAllEPGProgram';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const epgBuilder = new EPGProgramBuilder(uid);
const ddbClient = new DynamoDBClient({});
const s3Client = new S3Client({});
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
const storageAdaptor = new StorageAdaptor(s3Client, process.env.STORAGE_BUCKET!, uid);
const lambdaClient = new LambdaClient({});
const logTracker = new LogTrackAdaptor(process.env.LOG_TRACK_ARN!, lambdaClient, logger);

const domain = new DeleteAllEPGProgramsDomain(
  epgRepository,
  storageAdaptor,
  logTracker,
);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const deleteAllEPGProgramHandler = async (event: DeleteAllEPGProgramEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<DeleteAllEPGProgramEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(deleteAllEPGProgramHandler);
