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
import Channel from '../../shared/Channel';
import StreamFactory from '../../../stream/shared/StreamFactory';
import StreamRepository from '../../../stream/shared/StreamRepository';
import EPG from '../../../epg/shared/EPG';
import EPGTemplate from '../../../epgTemplate/shared/EPGTemplate';
import Location from '../../../location/shared/Location';
import Package from '../../../package/shared/Package';
import Platform from '../../../platform/shared/Platform';
import Genre from '../../../genre/shared/Genre';
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
import EPGFactory from '../../../epg/shared/EPGFactory';
import EPGRepository from '../../../epg/shared/EPGRepository';
import EPGProgramBuilder from '../../../epg/shared/EPGProgramBuilder';
import { StreamFormat, StreamType } from '../../../shared/dto/StreamDto';
import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import { LocationType } from '../../../shared/dto/LocationDto';
import {
  RevenueModel, PackageType,
} from '../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import ChannelFactory from '../../shared/ChannelFactory';
import eventMock from '../../shared/tests/event-mock';
import GetChannelsDomain from '../GetChannelsDomain';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import ChannelRepository from '../../shared/ChannelRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const mediapackageMock = mockClient(MediaPackageClient);

const TEST_TABLE_NAME = 'test-GetChannelsAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const uid = new UIDGenerator();

const uidEPGpg = {
  generate: () => 'epg-pg',
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
const programBuilder = new EPGProgramBuilder(uidEPGpg);
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

const channelRepository = new ChannelRepository(ddbClient, TEST_TABLE_NAME, channelFactory);

const domain = new GetChannelsDomain(channelRepository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
  mediapackageMock.onAnyCommand().resolves({});
});

afterAll(() => {
  jest.useRealTimers();
});

const CASES = [{
  mockEvent: {
    ...eventMock,
    queryStringParameters: {
      startTime: '2021',
      endTime: '2023',
    },
  },
  expected: {
    body: '',
    statusCode: 200,
  },
}, {
  mockEvent: {
    ...eventMock,
    queryStringParameters: {
      search: 'tv',
    },
  },
  expected: {
    body: '',
    statusCode: 200,
  },
}, {
  mockEvent: {
    ...eventMock,
    queryStringParameters: {
      active: 'true',
      search: 'tv',
    },
  },
  expected: {
    body: '',
    statusCode: 200,
  },
}, {
  mockEvent: {
    ...eventMock,
    queryStringParameters: {
      startTime: '2021',
      endTime: '2023',
      packages: 'package-id',
      providers: 'provider-id,other-id',
      sortOrder: 'DESC',
    },
  },
  expected: {
    body: '',
    statusCode: 200,
  },
}, {
  mockEvent: {
    ...eventMock,
    queryStringParameters: {
      search: 'tv',
      exclude: 'epg,provider,platforms,categories,packages,genres,locations,streams,brands,distributors',
    },
  },
  expected: {
    body: '',
    statusCode: 200,
  },
}, {
  mockEvent: { ...eventMock },
  expected: {
    body: '{"error":"Unknown channel dependency Error: on channel id=8b7f7a8fe2275deb: provider id=provider-id"}',
    statusCode: 404,
  },
}];

describe('Get Channel ApiGatewayAdaptor', () => {
  let genre: Genre;
  let platform: Platform;
  let category: Category;
  let packageItem: Package;
  let location: Location;
  let provider: Provider;
  let stream: Stream;
  let channel: Channel;
  let channel2: Channel;
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
      programs: Array.from(Array(4)
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
      })),
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
    }, {
      filter: {
        startTime: '2021',
        endTime: '2023',
      },
      ignore: false,
    });

    channel2 = await channelFactory.toDomain({
      ...channelDto,
      name: 'TV',
      provider: 'provider-id',
      visible: false,
      epg: epg.id,
      platforms: [platform.id],
      categories: [category.id],
      packages: [packageItem.id],
      genres: [genre.id],
      locations: [location.id],
      streams: [stream.id],
      distributors: existingDistributorIds,
      brands: existingBrandIds,
      enabled: true,
    }, {
      filter: {
        startTime: '2021',
        endTime: '2023',
      },
      ignore: false,
    });

    await channelRepository.save(channel);
    await channelRepository.save(channel2);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  let count = CASES.length;
  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    beforeAll(async () => {
      CASES[0].expected.body = JSON.stringify({
        channels: [channel, channel2],
      });
      if (count > 1) {
        const channel3 = await channelFactory.toDomain(
          await channelFactory.toPersistence(channel2),
        );
        CASES[1].expected.body = JSON.stringify({
          channels: [channel3],
        });
      }
      CASES[2].expected.body = JSON.stringify({
        channels: [],
      });
      CASES[3].expected.body = JSON.stringify({
        channels: [channel2, channel],
      });
      const channel2Cpy = { ...channel2 };
      delete channel2Cpy.epg;
      delete channel2Cpy.provider;
      delete channel2Cpy.platforms;
      delete channel2Cpy.categories;
      delete channel2Cpy.packages;
      delete channel2Cpy.genres;
      delete channel2Cpy.locations;
      delete channel2Cpy.streams;
      delete channel2Cpy.brands;
      delete channel2Cpy.distributors;
      CASES[4].expected.body = JSON.stringify({
        channels: [channel2Cpy],
      });
    });
    afterAll(async () => {
      count -= 1;
      if (count === 1) { await providerRepository.remove(provider); }
    });

    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      const response = await apiGatewayAdaptor.handler(mockEvent);
      expect(response.statusCode).toStrictEqual(expected.statusCode);
      if (response.statusCode !== 404) {
        expect(JSON.parse(response.body)).toStrictEqual(JSON.parse(expected.body));
      }/* else {
        expect(response.body).toStrictEqual(expected.body);
      } */
    });
  });
});
