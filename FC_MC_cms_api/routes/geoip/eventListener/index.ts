import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { MediaPackageClient } from '@aws-sdk/client-mediapackage';
import { WAFV2Client } from '@aws-sdk/client-wafv2';

import { injectLambdaContext, Logger } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler, Tracer } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import { Context, EventBridgeEvent } from 'aws-lambda';

import BrandRepository from '../../brand/shared/BrandRepository';
import CategoryMap from '../../category/shared/CategoryMap';
import CategoryRepository from '../../category/shared/CategoryRepository';
import ChannelFactory from '../../channel/shared/ChannelFactory';
import ChannelRepository from '../../channel/shared/ChannelRepository';
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
import { PublisherEvent } from '../../shared/PublisherAdaptor';
import StreamFactory from '../../stream/shared/StreamFactory';
import StreamRepository from '../../stream/shared/StreamRepository';
import EpisodeFactory from '../../vod/episode/shared/EpisodeFactory';
import EpisodeRepository from '../../vod/episode/shared/EpisodeRepository';
import MovieFactory from '../../vod/movie/shared/MovieFactory';
import MovieRepository from '../../vod/movie/shared/MovieRepository';
import SeriesFactory from '../../vod/series/shared/SeriesFactory';
import SeriesRepository from '../../vod/series/shared/SeriesRepository';
import FirewallAdaptor from '../shared/FirewallAdaptor';
import GeoIpRuleFactory from '../shared/GeoIpRuleFactory';
import GeoIpRuleRepository from '../shared/GeoIpRuleRepository';
import IPSetAdaptor from '../shared/IPSetAdaptor';
import OriginEndpoint from '../shared/OriginEndpoint';
import RuleBuilder from '../shared/RuleBuilder';
import RuleGroupAdaptor from '../shared/RuleGroupAdaptor';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const SERVICE_NAME = 'FreeCast-API-GeoIpEventListener';
const logger = new Logger({ serviceName: SERVICE_NAME });
const tracer = new Tracer({ serviceName: SERVICE_NAME });

const uid = new UIDGenerator();
const ddbClient = new DynamoDBClient({});
const wafClient = new WAFV2Client({ region: 'us-east-1' });
const mpClient = new MediaPackageClient({});
const originEndpointAdaptor = new OriginEndpoint(mpClient);
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
const genreRepository = new GenreRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  genreMap,
);

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
const distributorRepository = new DistributorRepository(httpClient, 'https://api-services.freecast.com/affiliates/api/distributors/');

const brandRepository = new BrandRepository(httpClient, 'https://api-services.freecast.com/branding/api/v0/brands/');

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

const movieRepository = new MovieRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  movieFactory,
);

const geoIpRuleFactory = new GeoIpRuleFactory(uid, packageRepository);
const geoIpRuleRepository = new GeoIpRuleRepository(
  ddbClient,
  process.env.CMS_TABLE_NAME!,
  geoIpRuleFactory,
);
const ipSetAdaptor = new IPSetAdaptor(wafClient);
const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
const ruleBuilder = new RuleBuilder();

const firewallAdaptor = new FirewallAdaptor(
  wafClient,
  ruleBuilder,
  geoIpRuleRepository,
  channelRepository,
  originEndpointAdaptor,
  ipSetAdaptor,
  ruleGroupAdaptor,
  seriesRepository,
  movieRepository,
);

const handler = async (_event: EventBridgeEvent<string, PublisherEvent>, _context: Context) => {
  _context.callbackWaitsForEmptyEventLoop = false;
  // Re-create rules
  const rules = await firewallAdaptor.createRule();
  await firewallAdaptor.createACL(rules);
};

export default middy(handler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
