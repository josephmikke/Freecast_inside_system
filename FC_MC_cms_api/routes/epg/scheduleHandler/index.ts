import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import jp from 'jsonpath';

import { injectLambdaContext, Logger } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler, Tracer } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';

import EPGTemplateFactory from '../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../epgTemplate/shared/EPGTemplateRepository';
import CSVParserAdaptor from '../shared/csv/CSVParserAdaptor';
import CSVToObject from '../shared/csv/CSVToObject';
import EPGFactory from '../shared/EPGFactory';
import EPGProgramBuilder from '../shared/EPGProgramBuilder';
import EPGRepository from '../shared/EPGRepository';
import HttpClientAdaptor from '../shared/HttpClientAdaptor';
import JsonParserAdaptor from '../shared/json/JSONParserAdaptor';
import TransformerAdaptor from '../shared/TransformerAdaptor';
import XMLParserAdaptor from '../shared/xml/XMLParserAdaptor';
import XMLPathAdaptor from '../shared/xml/XMLPathAdaptor';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import IngestEPGDomain from './IngestEPGDomain';

const ddbClient = new DynamoDBClient({});
const uid = new UIDGenerator();
const epgTemplateFactory = new EPGTemplateFactory(uid);
const epgProgramBuilder = new EPGProgramBuilder(uid);
const epgTemplateRepository = new EPGTemplateRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  epgTemplateFactory,
);
const epgFactory = new EPGFactory(uid, epgTemplateRepository);
const epgRepostiory = new EPGRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  epgFactory,
  epgProgramBuilder,
);

const httpClient = new HttpClientAdaptor();

const transformerAdaptor = new TransformerAdaptor();
const csvToObject = new CSVToObject();
const xmlPath = new XMLPathAdaptor();
const jsonParser = new JsonParserAdaptor(httpClient, jp, transformerAdaptor, epgProgramBuilder);
const csvParser = new CSVParserAdaptor(
  httpClient,
  csvToObject,
  transformerAdaptor,
  epgProgramBuilder,
);
const xmlParser = new XMLParserAdaptor(
  httpClient,
  xmlPath,
  transformerAdaptor,
  epgProgramBuilder,
);

const SERVICE_NAME = 'FreeCast-API-ingestEPG';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const handler = async (event: { epgId: string }, context: any) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const ingestEpgDomain = new IngestEPGDomain(epgRepostiory, {
    csv: csvParser,
    json: jsonParser,
    xml: xmlParser,
  }, epgFactory);
  logger.info('Start ingestion');
  try {
    await ingestEpgDomain.ingestEPG(event.epgId);
    logger.info('Ingestion done');
    return {
      statusCode: 200,
      body: '',
    };
  } catch (e) {
    logger.error('Ingestion failed', e);
    return {
      statusCode: 500,
      body: e.message,
    };
  }
};

export default middy(handler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
