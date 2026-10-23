import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { MediaPackageClient } from '@aws-sdk/client-mediapackage';
import { mockClient } from 'aws-sdk-client-mock';

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
import Genre from '../../../genre/shared/Genre';
import Location from '../../../location/shared/Location';
import Package from '../../../package/shared/Package';
import Platform from '../../../platform/shared/Platform';
import GenreMap from '../../../genre/shared/GenreMap';
import GenreRepository from '../../../genre/shared/GenreRepository';
import LocationFactory from '../../../location/shared/LocationFactory';
import LocationRepository from '../../../location/shared/LocationRepository';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import Provider from '../../../provider/shared/Provider';
import ProviderMap from '../../../provider/shared/ProviderMap';
import ProviderRepository from '../../../provider/shared/ProviderRepository';
import EPGTemplateFactory from '../../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../../epgTemplate/shared/EPGTemplateRepository';
import { ChannelRequestDto } from '../../../shared/dto/ChannelDto';
import { StreamFormat, StreamType } from '../../../shared/dto/StreamDto';
import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import { LocationType } from '../../../shared/dto/LocationDto';
import { RevenueModel, PackageType } from '../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import Channel from '../Channel';
import { ChannelError } from '../ChannelError';
import ChannelFactory from '../ChannelFactory';

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

const TEST_TABLE_NAME = 'test-channelFactory';

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

describe('ChannelFactory', () => {
  let genre: Genre;
  let platform: Platform;
  let category: Category;
  let packageItem: Package;
  let location: Location;
  let provider: Provider;
  let epg: EPG;
  let epgTemplateAsset: EPGTemplate;
  let channelDto: ChannelRequestDto;
  let channel: Channel;
  let stream: Stream;
  const existingDistributorIds = ['13', '28', '36'];
  const existingBrandIds = ['118', '131', '237'];
  let channelFactory: ChannelFactory;

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    genre = Genre.create({
      weight: 1,
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
      alternateThumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
      description: 'Live market coverage and analysis.',
      catchup: true,
      archive: false,
      rating: MovieRating.NC_17,
      slug: 'sc-202639449',
      subtitle: 'Test subtitle',
    }));

    epgTemplateAsset = await epgTemplateFactory.toDomain(epgTemplate);

    await epgTemplateRepository.save(epgTemplateAsset);

    channelDto = {
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
      mediapackageId: 'mediapackage-id',
      thumbnail: 'channels/channelid/thumbnail.png',
      provider: '',
      epg: '',
      packages: [],
      categories: [],
      brands: [],
      streams: [],
      platforms: [],
    };

    channelFactory = new ChannelFactory(
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
    await genreRepository.save(genre);
    await platformRepository.save(platform);
    await categoryRepository.save(category);
    await packageRepository.save(packageItem);
    await genreRepository.save(genre);
    await streamRepository.save(stream);
    // not saving the location entry
  });

  afterAll(async () => {
    await providerRepository.remove(provider);
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('toDomain - should throw because of unknown provider', async () => {
    await expect(async () => channelFactory.toDomain({
      ...channelDto,
    })).rejects.toThrowError(ChannelError.UnknownChannelDependency);
  });

  it('toDomain - should throw because of unknown epg', async () => {
    await expect(async () => channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
    })).rejects.toThrowError(ChannelError.UnknownChannelDependency);
  });

  it('toDomain - should throw because of unknown platforms', async () => {
    await expect(async () => channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
    })).rejects.toThrowError(ChannelError.UnknownChannelDependency);
  });

  it('toDomain - should throw because of unknown categories', async () => {
    await expect(async () => channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      platforms: [platform.id],
    })).rejects.toThrowError(ChannelError.UnknownChannelDependency);
  });

  it('toDomain - should throw because of unknown packages', async () => {
    await expect(async () => channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      platforms: [platform.id],
      categories: [category.id],
    })).rejects.toThrowError(ChannelError.UnknownChannelDependency);
  });

  it('toDomain - should throw because of unknown brands', async () => {
    await expect(async () => channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
    })).rejects.toThrowError(ChannelError.UnknownChannelDependency);
  });

  it('toDomain - should throw because of unknown streams', async () => {
    await expect(async () => channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      categories: [category.id],
      packages: [packageItem.id],
      brands: existingBrandIds,
    })).rejects.toThrowError(ChannelError.UnknownChannelDependency);
  });

  it('toDomain - should create a Channel instance', async () => {
    channel = await channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      brands: existingBrandIds,
      streams: [stream.id],
    });

    expect(channel).toBeDefined();
    expect(channel.id).toEqual('my-channel-id');
  });

  it('toDomain - should throw when handling relations', async () => {
    await expect(async () => channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [stream.id],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    })).rejects.toThrowError(ChannelError.UnknownChannelDependency);
  });

  it('toDomain - should create a new Stream from StreamProps', async () => {
    await locationRepository.save(location);
    const newStream = {
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
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [newStream],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    });

    expect(channel).toBeDefined();
    expect(channel.id).toEqual('my-channel-id');
    expect(channel.streams?.length).toEqual(1);
    if (!channel.streams) return;
    expect(await streamRepository.findOne(channel.streams[0].id)).toBeDefined();
  });

  it('toDomain - should throw because Stream extId already exists', async () => {
    const newStream = {
      name: 'my-new-channel-stream-2',
      extId: 'new-channel-stream',
      type: StreamType.EMBED_CODE,
      format: StreamFormat.DASH,
      data: 'data2',
      daiParams: false,
    };
    const stream2 = {
      name: 'my-new-channel-stream-2',
      extId: 'new-channel-stream',
      type: StreamType.EMBED_CODE,
      format: StreamFormat.DASH,
      data: 'data2',
      daiParams: false,
    };

    await expect(async () => channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [newStream, stream2],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    })).rejects.toThrowError(ChannelError.ChannelStreamCreation);
  });

  it('toDomain - should create a Channel instance', async () => {
    channel = await channelFactory.toDomain({
      ...channelDto,
      provider: 'provider-id',
      epg: epg.id,
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [stream.id],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
    });

    expect(channel).toBeDefined();
    expect(channel.id).toEqual('my-channel-id');
  });

  it('toPersistance - should return correct ids', async () => {
    const resChannel = channelFactory.toPersistence(channel);

    expect(resChannel).toBeDefined();
    expect(resChannel.id).toEqual('my-channel-id');
    expect(resChannel.provider).toEqual('provider-id');
    expect(resChannel.epg).toEqual(epg.id);
    expect(resChannel.platforms).toContain('platform-id');
    expect(resChannel.categories).toContain('category-id');
    expect(resChannel.packages).toContain('package-id');
    expect(resChannel.genres).toContain('genre-id');
    expect(resChannel.locations).toContain('location-id');
    expect(resChannel.streams).toContain('stream-id');
    expect(resChannel.distributors).toContain(existingDistributorIds[0]);
    expect(resChannel.brands).toContain(existingBrandIds[0]);
  });

  it('sortByName - should sort correctly', async () => {
    expect(ChannelFactory.sortByName(provider, genre)).toEqual(-1);
    expect(ChannelFactory.sortByName(genre, provider)).toEqual(1);
    expect(ChannelFactory.sortByName(genre, genre)).toEqual(0);
  });
});
