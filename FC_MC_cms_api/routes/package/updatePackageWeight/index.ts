import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import { Context } from 'aws-lambda';
import errorHandler from 'routes/shared/middlewares/errorHandler';

import PlatformMap from '../../platform/shared/PlatformMap';
import PlatformRepository from '../../platform/shared/PlatformRepository';
import { UpdatePackageWeightEvent } from '../../shared/dto/PackageDto';
import PackageFactory from '../shared/PackageFactory';
import PackageRepository from '../shared/PackageRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import UpdatePackageWeightDomain from './UpdatePackageWeightDomain';

const SERVICE_NAME = 'FreeCast-API-updatePackageWeight';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const platformMap = new PlatformMap(uid);
const ddbClient = new DynamoDBClient({});
const platformRepository = new PlatformRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  platformMap,
);
const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  packageFactory,
);
const domain = new UpdatePackageWeightDomain(packageRepository, packageFactory);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const addPackageHandler = async (event: UpdatePackageWeightEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<UpdatePackageWeightEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(addPackageHandler);
