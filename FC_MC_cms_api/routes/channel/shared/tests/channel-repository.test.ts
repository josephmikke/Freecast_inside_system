import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { MediaPackageClient } from '@aws-sdk/client-mediapackage';
import { mockClient } from 'aws-sdk-client-mock';

import MediaPackageId from '../../../shared/valueObjects/MediaPackageId';
import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../utils/in-memory-relation-repositories';
import { MovieRating, Rating } from '../../../asset/shared/Rating';
import Category from '../../../category/shared/Category';
import CategoryMap from '../../../category/shared/CategoryMap';
import CategoryRepository from '../../../category/shared/CategoryRepository';
import Stream from '../../../stream/shared/Stream';
import StreamFactory from '../../../stream/shared/StreamFactory';
import StreamRepository from '../../../stream/shared/StreamRepository';
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
import { StreamFormat, StreamProps, StreamType } from '../../../shared/dto/StreamDto';
import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import { LocationType } from '../../../shared/dto/LocationDto';
import {
  RevenueModel, PackageType,
} from '../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import Channel from '../Channel';
import ChannelFactory from '../ChannelFactory';
import ChannelRepository from '../ChannelRepository';
import { SortType, SortOrder } from '../../../shared/dto/ChannelDto';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const mediapackageMock = mockClient(MediaPackageClient);

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const TEST_TABLE_NAME = 'test-channelRepository';

const uid = new UIDGenerator();

const uidChannel = {
  generate: () => 'my-channel-id',
};

const uidCategory = {
  generate: () => 'category-id',
};

const uidGenre = {
  generate: () => 'genre-id',
};

const providerMap = new ProviderMap(uid);
const providerRepository = new ProviderRepository(ddbClient, TEST_TABLE_NAME, providerMap);

const epgTemplateFactory = new EPGTemplateFactory(uid);
const epgTemplateRepository = new EPGTemplateRepository(
  ddbClient,
  TEST_TABLE_NAME,
  epgTemplateFactory,
);
const programBuilder = new EPGProgramBuilder(uid);
const epgFactory = new EPGFactory(uid, epgTemplateRepository);
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

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
  mediapackageMock.onAnyCommand().resolves({});
});

afterAll(() => {
  jest.useRealTimers();
});

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

const channelFactoryRdm = new ChannelFactory(
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
  vastId: '',
  visible: true,
  mediapackageId: '',
  thumbnail: 'channels/channelid/thumbnail.png',
  provider: '',
  epg: '',
  platforms: [],
  packages: [],
  categories: [],
  brands: [],
  exclude: '',
  streams: [],
};

describe('ChannelRepository - Empty database', () => {
  const channel = Channel.create({
    ...channelDto,
    createdAt: '2022-10-17T00:00:00.000Z',
    updatedAt: '2022-10-17T00:00:00.000Z',
    mediapackageId: new MediaPackageId(''),
    enabled: true,
  }, 'channel-id');

  beforeEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('should check if a Channel exists and return false', async () => {
    expect(await channelRepository.exists(channel)).toBeFalsy();
  });

  it('should return all an empty array', async () => {
    expect(await channelRepository.findAll()).toEqual({ channels: [], nextToken: undefined });
  });

  it('should return false if not relationships are found', async () => {
    expect(await channelRepository.hasRelationships(channel)).toBeFalsy();
  });

  it('should return false if cannot save', async () => {
    expect(await channelRepository.save(channel)).toBeTruthy();
  });

  it('should return undefined if not found', async () => {
    expect(await channelRepository.findOne(channel.id)).toBeUndefined();
  });

  it('should return empty array if not found', async () => {
    expect(await channelRepository.findMany([channel.id])).toEqual([]);
  });
});

describe('ChannelRepository - Non-Empty database', () => {
  let genre: Genre;
  let platform: Platform;
  let category: Category;
  let packageItem: Package;
  let location: Location;
  let provider: Provider;
  let epg: EPG;
  let epgTemplateAsset: EPGTemplate;
  let channel: Channel;
  let stream: Stream;
  const existingDistributorIds = ['13', '28', '36'];
  const existingBrandIds = ['118', '131', '237'];

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

    const epgTemplate = {
      extId: 'json-template',
      mapping: {
        title: '$.title',
        ext_id: '$.ext_id',
      },
      name: 'JSON Template',
      templateType: EpgTemplateType.JSON,
    };
    const epgPrograms = Array.from(Array(4)
      .keys()).map((key) => ({
      id: 'random-id',
      title: 'Yahoo! Finance Live',
      ext_id: `202639449${key}`, // should be unique
      duration: '3600',
      start_time: `2022-11-30T1${key}:01:00Z`,
      end_time: `2022-11-30T1${key + 1}:00:00Z`,
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
      alternateThumbnail: null,
      archive: false,
      rating: MovieRating.NOT_RATED,
      description: 'Live market coverage and analysis.',
      catchup: true,
      slug: 'sc-202639449',
      subtitle: 'Test subtitle',
    }));

    epgTemplateAsset = await epgTemplateFactory.toDomain(epgTemplate);

    await epgTemplateRepository.save(epgTemplateAsset);

    await providerRepository.save(provider);
    epg = await epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplateAsset.id,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: epgPrograms,
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    });
    await epgRepository.save(epg);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('save - should save a Channel instance', async () => {
    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await genreRepository.save(genre);
    await locationRepository.save(location);
    await streamRepository.save(stream);

    const streamProps: StreamProps = {
      name: 'my-new-channel-stream',
      extId: 'new-channel-stream',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: 'data',
      daiParams: true,
    };

    channel = await channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      platforms: [platform.id],
      categories: [{ id: category.id }],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [stream.id, streamProps],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    });

    expect(await channelRepository.save(channel)).toBeTruthy();
  });

  it('findOne - should get previously saved Channel instance', async () => {
    const resultChannel = await channelRepository.findOne(channel.id);

    expect(resultChannel).toBeDefined();
    expect(resultChannel?.id).toEqual(channel.id);
  });

  it('findAll - should get previously saved Channel instances', async () => {
    const channel2 = await channelFactoryRdm.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      platforms: [platform.id],
      categories: [{ id: category.id, weight: 5000 }],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [stream.id],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
      visible: false,
      name: 'channel_name_123',
      slug: 'value_channel',
      createdAt: '2022-09-17T00:00:00.000Z',
      updatedAt: '2022-11-17T00:00:00.000Z',
    });
    await channelRepository.save(channel2);

    // Default: sort by Name, ascending order
    let resultChannel = await channelRepository.findAll();

    expect(resultChannel.channels.length).toEqual(2);
    expect(resultChannel.channels[0].name).toEqual(channel2.name);
    expect(resultChannel.channels[0].categories).toBeDefined();
    expect(resultChannel.channels[0].categoriesWeight).toBeUndefined();
    if (resultChannel.channels[0].categories !== undefined) {
      expect(resultChannel.channels[0].categories[0].weight).toEqual(5000);
    }

    const categoriesWeight = await categoryRepository.getParentRelationships('CHANNEL', resultChannel.channels[0].id);
    expect(categoriesWeight.length).toEqual(1);
    expect(categoriesWeight[0].id).toEqual(category.id);
    expect(categoriesWeight[0].weight).toEqual(5000);

    // sort by Name, ascending order
    resultChannel = await channelRepository.findAll({
      sort: {
        attr: SortType.NAME,
        order: SortOrder.ASC,
      },
    });

    expect(resultChannel.channels.length).toEqual(2);
    expect(resultChannel.channels[0].name).toEqual(channel2.name);

    // sort by Name, descending order
    resultChannel = await channelRepository.findAll({
      sort: {
        attr: SortType.NAME,
        order: SortOrder.DESC,
      },
    });

    expect(resultChannel.channels.length).toEqual(2);
    expect(resultChannel.channels[0].name).toEqual(channel.name);

    // sort by Id (slug), ascending order
    resultChannel = await channelRepository.findAll({
      sort: {
        attr: SortType.ID,
        order: SortOrder.ASC,
      },
    });

    expect(resultChannel.channels.length).toEqual(2);
    expect(resultChannel.channels[0].slug).toEqual(channel.slug);

    // sort by Id (slug), descending order
    resultChannel = await channelRepository.findAll({
      sort: {
        attr: SortType.ID,
        order: SortOrder.DESC,
      },
    });

    expect(resultChannel.channels.length).toEqual(2);
    expect(resultChannel.channels[0].slug).toEqual(channel2.slug);

    // sort by creation date, ascending order
    resultChannel = await channelRepository.findAll({
      sort: {
        attr: SortType.CREATED,
        order: SortOrder.ASC,
      },
    });

    expect(resultChannel.channels.length).toEqual(2);
    expect(resultChannel.channels[0].createdAt).toEqual(channel2.createdAt);

    // sort by creation date, descending order
    resultChannel = await channelRepository.findAll({
      sort: {
        attr: SortType.CREATED,
        order: SortOrder.DESC,
      },
    });

    expect(resultChannel.channels.length).toEqual(2);
    expect(resultChannel.channels[0].createdAt).toEqual(channel.createdAt);

    // sort by updated date, ascending order
    resultChannel = await channelRepository.findAll({
      sort: {
        attr: SortType.UPDATED,
        order: SortOrder.ASC,
      },
    });

    expect(resultChannel.channels.length).toEqual(2);
    expect(resultChannel.channels[0].updatedAt).toEqual(channel.updatedAt);

    // sort by updated date, descending order
    resultChannel = await channelRepository.findAll({
      sort: {
        attr: SortType.UPDATED,
        order: SortOrder.DESC,
      },
    });

    expect(resultChannel.channels.length).toEqual(2);
    expect(resultChannel.channels[0].updatedAt).toEqual(channel2.updatedAt);

    // Default: sort by Name, ascending order, with search
    resultChannel = await channelRepository.findAll({
      search: 'name',
    });

    expect(resultChannel.channels.length).toEqual(1);
    expect(resultChannel.channels[0].name).toEqual(channel2.name);

    // Default: sort by Name, ascending order, with unknown search
    resultChannel = await channelRepository.findAll({
      search: 'unknown',
    });

    expect(resultChannel.channels.length).toEqual(0);

    // Default: sort visible, ascending order
    resultChannel = await channelRepository.findAll({
      filter: {
        active: true,
      },
    });

    expect(resultChannel.channels.length).toEqual(1);
    expect(resultChannel.channels[0].name).toEqual(channel.name);

    // Default: sort visible, ascending order
    resultChannel = await channelRepository.findAll({
      filter: {
        active: false,
      },
    });

    expect(resultChannel.channels.length).toEqual(1);
    expect(resultChannel.channels[0].name).toEqual(channel2.name);

    // Default: sort visible + name, ascending order
    resultChannel = await channelRepository.findAll({
      filter: {
        active: false,
      },
      search: 'name',
    });

    expect(resultChannel.channels.length).toEqual(1);
    expect(resultChannel.channels[0].name).toEqual(channel2.name);

    // Default: sort visible + name, ascending order
    resultChannel = await channelRepository.findAll({
      filter: {
        active: true,
      },
      search: 'name',
    });

    expect(resultChannel.channels.length).toEqual(0);

    // Default: sort visible + name, ascending order
    resultChannel = await channelRepository.findAll({
      filter: {
        packages: [packageItem.id],
        providers: ['provider-id'],
      },
    });

    expect(resultChannel.channels.length).toEqual(2);

    // Default: sort visible + name, ascending order
    resultChannel = await channelRepository.findAll({
      filter: {
        platforms: ['unknown-id'],
      },
    });

    expect(resultChannel.channels.length).toEqual(0);

    // Default: sort visible + name, ascending order
    resultChannel = await channelRepository.findAll({
      filter: {
        platforms: [platform.id],
      },
    });

    expect(resultChannel.channels.length).toEqual(2);

    // Default: sort visible + name, ascending order
    resultChannel = await channelRepository.findAll({
      filter: {
        active: false,
        platforms: [platform.id],
      },
    });

    expect(resultChannel.channels.length).toEqual(1);
    expect(resultChannel.channels[0].name).toEqual(channel2.name);

    // Default: sort visible + name, ascending order
    resultChannel = await channelRepository.findAll({
      filter: {
        categories: [category.id],
      },
      search: 'reel',
    });

    expect(resultChannel.channels.length).toEqual(1);
    expect(resultChannel.channels[0].name).toEqual(channel.name);

    // Limit parameter
    resultChannel = await channelRepository.findAll({
      limit: 2,
    });
    expect(resultChannel.channels.length).toEqual(2);
    const token = {
      SK: 'ASSET#CHANNEL#my-channel-id',
      'GSI1-SK': 'reelz_sd',
      PK: 'ASSET#CHANNEL#my-channel-id',
      'GSI1-PK': 'ASSET#CHANNEL',
    };
    expect(resultChannel.nextToken).toEqual(Buffer.from(JSON.stringify(token)).toString('base64'));
    resultChannel = await channelRepository.findAll({
      nextToken: resultChannel.nextToken,
    });
    expect(resultChannel.channels).toHaveLength(0);
    expect(resultChannel.nextToken).toBeUndefined();
  });

  it('findMany - should get previously saved Channel instances', async () => {
    const resultChannel = await channelRepository.findMany([channel.id]);

    expect(resultChannel.length).toBeGreaterThan(0);
    expect(resultChannel[0].id).toEqual(channel.id);
  });

  it('remove - should remove previously saved Channel instances', async () => {
    expect(await channelRepository.remove(channel)).toBeTruthy();

    const resultChannel = await channelRepository.findOne(channel.id);
    expect(resultChannel).toBeUndefined();
  });
});

describe.each([
  (payload: Channel) => channelRepository.remove(payload),
  (payload: Channel) => channelRepository.save(payload),
  (payload: Channel) => channelRepository.exists(payload),
  (payload: Channel) => channelRepository.hasRelationships(payload),
  (id: string) => channelRepository.findOne(id),
  // An empty id list never reaches DynamoDB, so pass an id to hit the missing table
  () => channelRepository.findMany(['any-id']),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
