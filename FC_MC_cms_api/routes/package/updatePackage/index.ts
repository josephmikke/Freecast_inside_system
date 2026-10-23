import { CloudFrontClient } from '@aws-sdk/client-cloudfront';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpEventNormalizer from '@middy/http-event-normalizer';
import httpHeaderNormalizer from '@middy/http-header-normalizer';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import validator from '@middy/validator';
import { Context } from 'aws-lambda';
import CDNAdaptor from 'routes/shared/CDNAdaptor';

import PlatformMap from '../../platform/shared/PlatformMap';
import PlatformRepository from '../../platform/shared/PlatformRepository';
import { UpdatePackageEvent } from '../../shared/dto/PackageDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import StorageAdaptor from '../../shared/StorageAdaptor';
import { LogTrackAdaptor } from '../../shared/tracker/LogTrackAdaptor';
import PackageFactory from '../shared/PackageFactory';
import PackageRepository from '../shared/PackageRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import inputSchema from './assets/schema.json';
import UpdatePackageDomain from './UpdatePackageDomain';

const SERVICE_NAME = 'FreeCast-API-updatePackage';
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
const s3Client = new S3Client({});
const cloudfrontClient = new CloudFrontClient({});
const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  packageFactory,
);
const storage = new StorageAdaptor(s3Client, process.env.STORAGE_BUCKET!, uid);
const cdnAdaptor = new CDNAdaptor(cloudfrontClient, process.env.CDN_DISTRIBUTION_ID!);
const lambdaClient = new LambdaClient({});
const logTracker = new LogTrackAdaptor(process.env.LOG_TRACK_ARN!, lambdaClient, logger);
const domain = new UpdatePackageDomain(packageRepository, packageFactory, storage, cdnAdaptor, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const addPackageHandler = async (event: UpdatePackageEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<UpdatePackageEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors())
  .use(errorHandler)
  .handler(addPackageHandler);
