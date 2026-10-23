import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { SchedulerClient } from '@aws-sdk/client-scheduler';
import jp from 'jsonpath';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { Context } from 'aws-lambda';

import EPGTemplateFactory from '../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../epgTemplate/shared/EPGTemplateRepository';
import CDNAdaptor from '../../shared/CDNAdaptor';
import { UpdateEPGEvent } from '../../shared/dto/EPGDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import SchedulerAdaptor from '../../shared/scheduler/SchedulerAdaptor';
import StorageAdaptor from '../../shared/StorageAdaptor';
import { LogTrackAdaptor } from '../../shared/tracker/LogTrackAdaptor';
import CSVParserAdaptor from '../shared/csv/CSVParserAdaptor';
import CSVToObject from '../shared/csv/CSVToObject';
import EPGFactory from '../shared/EPGFactory';
import EPGProgramBuilder from '../shared/EPGProgramBuilder';
import EPGRepository from '../shared/EPGRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import HttpClientAdaptor from '../shared/HttpClientAdaptor';
import JsonParserAdaptor from '../shared/json/JSONParserAdaptor';
import TransformerAdaptor from '../shared/TransformerAdaptor';
import XMLParserAdaptor from '../shared/xml/XMLParserAdaptor';
import XMLPathAdaptor from '../shared/xml/XMLPathAdaptor';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import inputSchema from './assets/schema.json';
import UpdateEPGDomain from './UpdateEPGDomain';

const SERVICE_NAME = 'FreeCast-API-updateEPG';
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
const scheduler = new SchedulerAdaptor(new SchedulerClient({}));
const storageAdaptor = new StorageAdaptor(s3Client, process.env.STORAGE_BUCKET!, uid);

const cloudfrontClient = new CloudFrontClient({});
const cdnAdaptor = new CDNAdaptor(cloudfrontClient, process.env.CDN_DISTRIBUTION_ID!);

const httpClient = new HttpClientAdaptor();
const transformerAdaptor = new TransformerAdaptor();
const csvToObject = new CSVToObject();
const xmlPath = new XMLPathAdaptor();

const jsonParser = new JsonParserAdaptor(httpClient, jp, transformerAdaptor, epgBuilder);
const csvParser = new CSVParserAdaptor(httpClient, csvToObject, transformerAdaptor, epgBuilder);
const xmlParser = new XMLParserAdaptor(httpClient, xmlPath, transformerAdaptor, epgBuilder);

const lambdaClient = new LambdaClient({});
const logTracker = new LogTrackAdaptor(process.env.LOG_TRACK_ARN!, lambdaClient, logger);

const domain = new UpdateEPGDomain(
  epgRepository,
  epgTemplateRepository,
  {
    csv: csvParser,
    json: jsonParser,
    xml: xmlParser,
  },
  epgFactory,
  scheduler,
  process.env.SCHEDULER_ARN!,
  process.env.SCHEDULER_ROLE_ARN!,
  storageAdaptor,
  cdnAdaptor,
  logTracker,
);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const updateEPGHandler = async (event: UpdateEPGEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<UpdateEPGEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(updateEPGHandler);
