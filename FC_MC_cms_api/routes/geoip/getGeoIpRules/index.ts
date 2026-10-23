import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';

import PackageFactory from '../../package/shared/PackageFactory';
import PackageRepository from '../../package/shared/PackageRepository';
import PlatformMap from '../../platform/shared/PlatformMap';
import PlatformRepository from '../../platform/shared/PlatformRepository';
import { GetGeoIpRulesEvent } from '../../shared/dto/GeoIpRuleDto';
import errorHandler from '../../shared/middlewares/errorHandler';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import GeoIpRuleFactory from '../shared/GeoIpRuleFactory';
import GeoIpRuleRepository from '../shared/GeoIpRuleRepository';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import GetGeoIpRulesDomain from './GetGeoIpRulesDomain';

const SERVICE_NAME = 'FreeCast-API-getGeoIpRules';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const ddbClient = new DynamoDBClient({});
const platformFactory = new PlatformMap(uid);
const platformRepository = new PlatformRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  platformFactory,
);
const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  packageFactory,
);
const geoIpRuleFactory = new GeoIpRuleFactory(uid, packageRepository);
const geoIpRuleRepository = new GeoIpRuleRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  geoIpRuleFactory,
);

const domain = new GetGeoIpRulesDomain(geoIpRuleRepository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const getGeoIpRulesHandler = async (event: GetGeoIpRulesEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<GetGeoIpRulesEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(getGeoIpRulesHandler);
