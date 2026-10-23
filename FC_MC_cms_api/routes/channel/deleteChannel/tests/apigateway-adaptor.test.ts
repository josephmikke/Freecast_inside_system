import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { MediaPackageClient } from '@aws-sdk/client-mediapackage';
import { S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../utils/in-memory-relation-repositories';
import { Rating } from '../../../asset/shared/Rating';
import Category from '../../../category/shared/Category';
import CategoryMap from '../../../category/shared/CategoryMap';
import CategoryRepository from '../../../category/shared/CategoryRepository';
import EPG from '../../../epg/shared/EPG';
import EPGFactory from '../../../epg/shared/EPGFactory';
import EPGProgramBuilder from '../../../epg/shared/EPGProgramBuilder';
import EPGRepository from '../../../epg/shared/EPGRepository';
import EPGTemplate from '../../../epgTemplate/shared/EPGTemplate';
import EPGTemplateFactory from '../../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../../epgTemplate/shared/EPGTemplateRepository';
import Genre from '../../../genre/shared/Genre';
import GenreMap from '../../../genre/shared/GenreMap';
import GenreRepository from '../../../genre/shared/GenreRepository';
import Location from '../../../location/shared/Location';
import LocationFactory from '../../../location/shared/LocationFactory';
import LocationRepository from '../../../location/shared/LocationRepository';
import Package from '../../../package/shared/Package';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import Platform from '../../../platform/shared/Platform';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import Provider from '../../../provider/shared/Provider';
import ProviderMap from '../../../provider/shared/ProviderMap';
import ProviderRepository from '../../../provider/shared/ProviderRepository';
import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import { LocationType } from '../../../shared/dto/LocationDto';
import {
  RevenueModel, PackageType,
} from '../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import { StreamFormat, StreamType } from '../../../shared/dto/StreamDto';
import { PublisherAdaptor } from '../../../shared/PublisherAdaptor';
import StorageAdaptor from '../../../shared/StorageAdaptor';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Stream from '../../../stream/shared/Stream';
import StreamFactory from '../../../stream/shared/StreamFactory';
import StreamRepository from '../../../stream/shared/StreamRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import Channel from '../../shared/Channel';
import ChannelFactory from '../../shared/ChannelFactory';
import ChannelRepository from '../../shared/ChannelRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeleteChannelDomain from '../DeleteChannelDomain';

const eventBridgeClient = new EventBridgeClient({});
const eventBridgeMock = mockClient(eventBridgeClient);

const mediapackageMock = mockClient(MediaPackageClient);

const TEST_TABLE_NAME = 'test-DeleteChannelAdaptor';

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const CHANNEL_ID = 'my-channel-id';

const uid = new UIDGenerator();

const uidChannel = {
  generate: () => CHANNEL_ID,
};

const uidEPG = {
  generate: () => 'epg-id',
};

const uidCategory = {
  generate: () => 'category-id',
};

const uidTemplate = {
  generate: () => 'template-id',
};

const uidGenre = {
  generate: () => 'genre-id',
};

const providerMap = new ProviderMap(uid);
const providerRepository = new ProviderRepository(ddbClient, TEST_TABLE_NAME, providerMap);

const epgTemplateFactory = new EPGTemplateFactory(uidTemplate);
const epgTemplateRepository = new EPGTemplateRepository(
  ddbClient,
  TEST_TABLE_NAME,
  epgTemplateFactory,
);
const programBuilder = new EPGProgramBuilder(uid);
const epgFactory = new EPGFactory(uidEPG, epgTemplateRepository);
const epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, programBuilder);

const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TEST_TABLE_NAME, platformMap);

const categoryMap = new CategoryMap(uidCategory);
const categoryRepository = new CategoryRepository(ddbClient, TEST_TABLE_NAME, categoryMap);

const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);

const genreMap = new GenreMap(uidGenre);
const genreRepository = new GenreRepository(ddbClient, TEST_TABLE_NAME, genreMap);

const locationFactory = new LocationFactory(uid, packageRepository);
const locationRepository = new LocationRepository(ddbClient, TEST_TABLE_NAME, locationFactory);

const streamFactory = new StreamFactory(uid);
const streamRepository = new StreamRepository(
  ddbClient,
  TEST_TABLE_NAME,
  streamFactory,
);

const distributorRepository = new InMemoryDistributorRepository();

const brandRepository = new InMemoryBrandRepository();

const channelFactory = new ChannelFactory(
  uidChannel,
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

const channelRepository = new ChannelRepository(ddbClient, TEST_TABLE_NAME, channelFactory);

const s3Client = new S3Client({});
const s3Mock = mockClient(s3Client);
const fileStore = new StorageAdaptor(s3Client, 'test', uid);
const publisherAdaptor = new PublisherAdaptor(eventBridgeClient);

const domain = new DeleteChannelDomain(channelRepository, fileStore, publisherAdaptor, new MockLogTracker());
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
  s3Mock.onAnyCommand().resolves({});
  mediapackageMock.onAnyCommand().resolves({});
  eventBridgeMock.onAnyCommand().resolves({});
});

afterAll(() => {
  jest.useRealTimers();
});

const handlerPayloadMock = {
  ...eventMock,
  pathParameters: {
    id: CHANNEL_ID,
  },
};

const CASES = [{
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: CHANNEL_ID } },
  expected: {
    body: '',
    statusCode: 204,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: 'random' } },
  expected: {
    body: '{"error":"Channel Not Found"}',
    statusCode: 404,
  },
},
{
  mockEvent: { ...handlerPayloadMock, pathParameters: undefined },
  expected: {
    body: '',
    statusCode: 500,
  },
}];

describe('Delete Channel ApiGatewayAdaptor', () => {
  let genre: Genre;
  let platform: Platform;
  let category: Category;
  let packageItem: Package;
  let location: Location;
  let provider: Provider;
  let stream: Stream;
  let channel: Channel;
  let epg: EPG;
  let epgTemplateAsset: EPGTemplate;

  const channelDto = {
    extId: 'channel-extId',
    catchUpActive: false,
    description: 'Test channel',
    lcn: 1007,
    name: 'Reelz_SD',
    rating: Rating.TV_Y7FV,
    availableDate: '2022-11-10T17:10:000Z',
    expirationDate: '2023-11-10T17:10:000Z',
    slug: 'reelz-sd',
    vastId: 'vastId',
    visible: true,
    mediapackageId: 'mediapackage-id',
    thumbnail: 'channels/mychannelid/thumbnail.png',
    provider: '',
    epg: '',
    packages: [],
    categories: [],
    brands: [],
    streams: [],
    platforms: [],
  };

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');

    genre = Genre.create({
      weight: 0,
      extId: 'genre-extId',
      name: 'Reelz_SD',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'genre-id');
    platform = Platform.create({
      extId: 'platform-extid',
      name: 'platform-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'platform-id');
    category = Category.create({
      extId: 'category-extid',
      name: 'category-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'category-id');
    packageItem = Package.create({
      extId: 'package-extid',
      name: 'package-name',
      thumbnail: 'packages/id/thumbnail.png',
      default: false,
      description: 'This is a package',
      price: '6.99',
      type: PackageType.INTERNAL,
      revenueModel: RevenueModel.PAID,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'package-id');
    location = Location.create({
      slug: 'location-extid',
      extId: 'location-extid',
      name: 'location-name',
      type: LocationType.PACKAGE,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'location-id');
    provider = Provider.create({
      extId: 'provider-extId',
      name: 'Provider Reelz_SD',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      configuration: {},
      type: [ProviderContentType.CHANNELS],
      subscription: true,
      format: ProviderNumberFormat.INTEGER,
      enabled: true,
      mtSlug: 'prod_vod_Reelz',
    }, 'provider-id');
    stream = Stream.create({
      extId: 'provider-extId',
      name: 'Provider Reelz_SD',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      daiParams: true,
      data: 'my-stream-data',
      enabled: true,
      weight: 0,
    }, 'stream-id');

    // all this part in beforeAll
    const epgTemplate = {
      extId: 'json-template',
      mapping: {
        title: '$.title',
        ext_id: '$.ext_id',
      },
      name: 'JSON Template',
      templateType: EpgTemplateType.JSON,
    };

    epgTemplateAsset = await epgTemplateFactory.toDomain(epgTemplate);
    await epgTemplateRepository.save(epgTemplateAsset);

    epg = await epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplateAsset.id,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: [],
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    });

    await providerRepository.save(provider);
    await epgRepository.save(epg);
    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await genreRepository.save(genre);
    await locationRepository.save(location);
    await streamRepository.save(stream);

    const streamProps = {
      name: 'my-new-channel-stream',
      extId: 'new-channel-stream',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: 'data',
      daiParams: true,
    };

    const existingDistributorIds = ['13', '28', '36'];
    const existingBrandIds = ['118', '131', '237'];

    channel = await channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [stream.id, streamProps],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
      enabled: true,
    });

    await channelRepository.save(channel);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    afterAll(async () => {
      await epgRepository.remove(epg);
    });

    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      const response = await apiGatewayAdaptor.handler(mockEvent);
      expect(response).toStrictEqual(expected);
    });
  });
});
