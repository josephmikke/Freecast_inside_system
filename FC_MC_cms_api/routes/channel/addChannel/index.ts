import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
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

import BrandRepository from '../../brand/shared/BrandRepository';
import CategoryMap from '../../category/shared/CategoryMap';
import CategoryRepository from '../../category/shared/CategoryRepository';
import DistributorRepository from '../../distributor/shared/DistributorRepository';
import EPGFactory from '../../epg/shared/EPGFactory';
import EPGProgramBuilder from '../../epg/shared/EPGProgramBuilder';
import EPGRepository from '../../epg/shared/EPGRepository';
import HttpClientAdaptor from '../../epg/shared/HttpClientAdaptor';
import EPGTemplateFactory from '../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../epgTemplate/shared/EPGTemplateRepository';
import GenreMap from '../../genre/shared/GenreMap';
import GenreRepository from '../../genre/shared/GenreRepository';
import LocationFactory from '../../location/shared/LocationFactory';
import LocationRepository from '../../location/shared/LocationRepository';
import PackageFactory from '../../package/shared/PackageFactory';
import PackageRepository from '../../package/shared/PackageRepository';
import PlatformMap from '../../platform/shared/PlatformMap';
import PlatformRepository from '../../platform/shared/PlatformRepository';
import ProviderMap from '../../provider/shared/ProviderMap';
import ProviderRepository from '../../provider/shared/ProviderRepository';
import { AddChannelEvent } from '../../shared/dto/ChannelDto';
import errorHandler from '../../shared/middlewares/errorHandler';
import { PublisherAdaptor } from '../../shared/PublisherAdaptor';
import StorageAdaptor from '../../shared/StorageAdaptor';
import { LogTrackAdaptor } from '../../shared/tracker/LogTrackAdaptor';
import StreamFactory from '../../stream/shared/StreamFactory';
import StreamRepository from '../../stream/shared/StreamRepository';
import ChannelFactory from '../shared/ChannelFactory';
import ChannelRepository from '../shared/ChannelRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import AddChannelDomain from './AddChannelDomain';
import ApiGatewayAdaptor from './ApiGatewayAdaptor';
import inputSchema from './assets/schema.json';

const SERVICE_NAME = 'FreeCast-API-addChannel';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const ddbClient = new DynamoDBClient({});
const eventBridgeClient = new EventBridgeClient({});
const publisherAdaptor = new PublisherAdaptor(eventBridgeClient);

const uid = new UIDGenerator();
const providerMap = new ProviderMap(uid);
const providerRepository = new ProviderRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  providerMap,
);

const epgTemplateFactory = new EPGTemplateFactory(uid);
const epgTemplateRepository = new EPGTemplateRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  epgTemplateFactory,
);
const programBuilder = new EPGProgramBuilder(uid);
const epgFactory = new EPGFactory(uid, epgTemplateRepository);
const epgRepository = new EPGRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  epgFactory,
  programBuilder,
);

const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  platformMap,
);

const categoryMap = new CategoryMap(uid);
const categoryRepository = new CategoryRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  categoryMap,
);

const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  packageFactory,
);

const genreMap = new GenreMap(uid);
const genreRepository = new GenreRepository(ddbClient, process.env.CMS_TABLE_NAME!, genreMap);

const locationFactory = new LocationFactory(uid, packageRepository);
const locationRepository = new LocationRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  locationFactory,
);

const streamFactory = new StreamFactory(uid);
const streamRepository = new StreamRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  streamFactory,
);

const s3Client = new S3Client({});
const storage = new StorageAdaptor(s3Client, process.env.STORAGE_BUCKET!, uid);

const httpClient = new HttpClientAdaptor();
const distributorRepository = new DistributorRepository(
  httpClient,
  process.env.DISTRIBUTORS_ENDPOINT!,
);
const brandRepository = new BrandRepository(httpClient, process.env.BRANDS_ENDPOINT!);

const channelFactory = new ChannelFactory(
  uid,
  providerRepository,
  epgRepository,
  platformRepository,
  categoryRepository,
  packageRepository,
  genreRepository,
  locationRepository,
  streamRepository,
  distributorRepository,
  brandRepository,
);
const channelRepository = new ChannelRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  channelFactory,
);

const lambdaClient = new LambdaClient({});
const logTracker = new LogTrackAdaptor(process.env.LOG_TRACK_ARN!, lambdaClient, logger);

const domain = new AddChannelDomain(channelRepository, channelFactory, storage, publisherAdaptor, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const addChannelHandler = async (event: AddChannelEvent, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return apiGatewayAdaptor.handler(event, context);
};

export default middy<AddChannelEvent>()
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(httpJsonBodyParser())
  .use(validator({ inputSchema }))
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(cors({
    exposeHeaders: 'Location',
  }))
  .use(errorHandler)
  .handler(addChannelHandler);
