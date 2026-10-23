import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { Logger, injectLambdaContext } from '@aws-lambda-powertools/logger';
import { Tracer, captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { Context, EventBridgeEvent } from 'aws-lambda';

import BrandRepository from '../../brand/shared/BrandRepository';
import CategoryMap from '../../category/shared/CategoryMap';
import CategoryRepository from '../../category/shared/CategoryRepository';
import DistributorRepository from '../../distributor/shared/DistributorRepository';
import HttpClientAdaptor from '../../epg/shared/HttpClientAdaptor';
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
import StreamFactory from '../../stream/shared/StreamFactory';
import StreamRepository from '../../stream/shared/StreamRepository';
import EpisodeFactory from '../episode/shared/EpisodeFactory';
import EpisodeRepository from '../episode/shared/EpisodeRepository';
import IngestionFactory from '../ingestion/shared/IngestionFactory';
import IngestionRepository from '../ingestion/shared/IngestionRepository';
import MovieFactory from '../movie/shared/MovieFactory';
import MovieRepository from '../movie/shared/MovieRepository';
import SeriesFactory from '../series/shared/SeriesFactory';
import SeriesRepository from '../series/shared/SeriesRepository';

import IngestedVodAdaptor from './HandleAssetCreationVodAdaptor';
import IngestVodDomain from './HandleAssetCreationVodDomain';

const SERVICE_NAME = 'FreeCast-API-IngestVod';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });
const ddbClient = new DynamoDBClient({});
const uid = new UIDGenerator();

const providerMap = new ProviderMap(uid);
const providerRepository = new ProviderRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  providerMap,
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

const httpClient = new HttpClientAdaptor();
const distributorRepository = new DistributorRepository(
  httpClient,
  process.env.DISTRIBUTORS_ENDPOINT!,
);
const brandRepository = new BrandRepository(httpClient, process.env.BRANDS_ENDPOINT!);

const episodeFactory = new EpisodeFactory(
  uid,
  streamRepository,
  process.env.NO_THUMBNAIL_URL!,
);
const episodeRepository = new EpisodeRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  episodeFactory,
);

const movieFactory = new MovieFactory(
  uid,
  providerRepository,
  platformRepository,
  categoryRepository,
  packageRepository,
  genreRepository,
  locationRepository,
  streamRepository,
  distributorRepository,
  brandRepository,
  process.env.NO_THUMBNAIL_URL!,
);
const movieRepository = new MovieRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  movieFactory,
);

const seriesFactory = new SeriesFactory(
  uid,
  providerRepository,
  platformRepository,
  categoryRepository,
  packageRepository,
  genreRepository,
  locationRepository,
  episodeRepository,
  distributorRepository,
  brandRepository,
  process.env.NO_THUMBNAIL_URL!,
);
const seriesRepository = new SeriesRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  seriesFactory,
);
const ingestionFactory = new IngestionFactory(uid);
const ingestionRepository = new IngestionRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  ingestionFactory,
);

const domain = new IngestVodDomain(
  episodeRepository,
  movieRepository,
  process.env.ASSETS_URL!,
  ingestionRepository,
  seriesRepository,
);

const adaptor = new IngestedVodAdaptor(domain);

const handler = async (event: EventBridgeEvent<string,
any>, context: Context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  return adaptor.handler(event, context);
};

export default middy(handler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
