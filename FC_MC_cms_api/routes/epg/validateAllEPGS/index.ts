import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import jp from 'jsonpath';
import { QueryCommand } from '@aws-sdk/client-dynamodb';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import { Context } from 'aws-lambda';
import errorHandler from 'routes/shared/middlewares/errorHandler';

import EPGTemplateFactory from '../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../epgTemplate/shared/EPGTemplateRepository';
import { GetEPGEvent } from '../../shared/dto/EPGDto';
import { LogTrackAdaptor } from '../../shared/tracker/LogTrackAdaptor';
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

import RepairEPGDomain from '../repairEPG/RepairEPGDomain';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import ValidateAllEPGsDomain from './ValidateAllEPGsDomain';

const SERVICE_NAME = 'FreeCast-API-validateAllEPGs';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const epgBuilder = new EPGProgramBuilder(uid);
const ddbClient = new DynamoDBClient({});
const lambdaClient = new LambdaClient({});
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

async function getEnabledChannelEpgIds(): Promise<Set<string>> {
  const tableName = process.env.CMS_TABLE_NAME!;
  const epgIds = new Set<string>();

  let lastEvaluatedKey: Record<string, unknown> | undefined;
  do {
    const response = await ddbClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: '#pk = :pk',
        FilterExpression:
          '(attribute_not_exists(#enabled) OR #enabled = :enabled) AND attribute_exists(#epg)',
        ExpressionAttributeNames: {
          '#pk': 'GSI1-PK',
          '#enabled': 'enabled',
          '#epg': 'epg',
        },
        ExpressionAttributeValues: {
          ':pk': { S: 'ASSET#CHANNEL' },
          ':enabled': { BOOL: true },
        },
        ProjectionExpression: '#enabled, #epg',
        ExclusiveStartKey: lastEvaluatedKey as any,
      }),
    );

    for (const item of response.Items ?? []) {
      // enabled defaults to true when absent in ChannelFactory, so treat missing as enabled.
      const enabledAttr = item.enabled;
      const enabled =
        enabledAttr?.BOOL === undefined ? true : Boolean(enabledAttr.BOOL);

      if (!enabled) continue;

      const epgId = item.epg?.S?.trim();
      if (!epgId) continue;
      epgIds.add(epgId);
    }

    lastEvaluatedKey = response.LastEvaluatedKey as any;
  } while (lastEvaluatedKey);

  return epgIds;
}

// Setup parsers for source URL validation
const httpClient = new HttpClientAdaptor();
const transformerAdaptor = new TransformerAdaptor();
const csvToObject = new CSVToObject();
const xmlPath = new XMLPathAdaptor();
const jsonParser = new JsonParserAdaptor(httpClient, jp, transformerAdaptor, epgBuilder);
const csvParser = new CSVParserAdaptor(
  httpClient,
  csvToObject,
  transformerAdaptor,
  epgBuilder,
);
const xmlParser = new XMLParserAdaptor(
  httpClient,
  xmlPath,
  transformerAdaptor,
  epgBuilder,
);

// Setup repair domain
const logTracker = new LogTrackAdaptor(process.env.LOG_TRACK_ARN!, lambdaClient, logger);
const repairDomain = new RepairEPGDomain(
  epgRepository,
  logTracker,
  lambdaClient,
  process.env.SCHEDULER_ARN!,
);

const domain = new ValidateAllEPGsDomain(
  epgRepository,
  {
    csv: csvParser,
    json: jsonParser,
    xml: xmlParser,
  },
  repairDomain,
  getEnabledChannelEpgIds,
);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const validateAllEPGsHandler = async (event: GetEPGEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<GetEPGEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(errorHandler)
  .handler(validateAllEPGsHandler);
