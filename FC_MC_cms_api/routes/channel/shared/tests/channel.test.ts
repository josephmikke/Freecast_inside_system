import { MediaPackageClient } from '@aws-sdk/client-mediapackage';
import { mockClient } from 'aws-sdk-client-mock';

import { Rating } from '../../../asset/shared/Rating';
import Brand from '../../../brand/shared/Brand';
import Category from '../../../category/shared/Category';
import Distributor from '../../../distributor/shared/Distributor';
import EPG from '../../../epg/shared/EPG';
import Genre from '../../../genre/shared/Genre';
import Location from '../../../location/shared/Location';
import Package from '../../../package/shared/Package';
import Platform from '../../../platform/shared/Platform';
import Provider from '../../../provider/shared/Provider';
import { ChannelRequestDto } from '../../../shared/dto/ChannelDto';
import { LocationType } from '../../../shared/dto/LocationDto';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import { StreamFormat, StreamType } from '../../../shared/dto/StreamDto';
import MediaPackageId from '../../../shared/valueObjects/MediaPackageId';
import Stream from '../../../stream/shared/Stream';
import Channel from '../Channel';

const mediapackageMock = mockClient(MediaPackageClient);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
  mediapackageMock.onAnyCommand().resolves({});
});

afterAll(() => {
  jest.useRealTimers();
});

process.env.ASSETS_URL = 'https://thumbnail.freecast.com';

const channelDto: ChannelRequestDto = {
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
  thumbnail: 'channels/mychannelid/thumbnail.png',
  provider: '',
  epg: '',
  packages: [],
  categories: [],
  brands: [],
  streams: [],
  platforms: [],
};
let channel: Channel;

describe('Channel creation', () => {
  it('should create a Channel instance', async () => {
    channel = Channel.create({
      ...channelDto,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      extId: channelDto.extId ?? '',
      expirationDate: channelDto.expirationDate ?? '',
      vastId: channelDto.vastId ?? '',
      exclude: '',
      epg: '',
      mediapackageId: new MediaPackageId('mediapackageid'),
      enabled: true,
    }, 'main-channel-id');

    expect(channel).toBeDefined();
  });
});

describe('Channel methods', () => {
  it('should update Channel thumbnail', async () => {
    expect(channel.thumbnail).toMatchObject({ url: `${process.env.ASSETS_URL}/channels/mychannelid/thumbnail.png` });

    channel.updateThumbnail('path/to/thumbnail.png');

    expect(channel.thumbnail).toMatchObject({ url: `${process.env.ASSETS_URL}/path/to/thumbnail.png` });
  });

  it('should update Provider', async () => {
    expect(channel.provider).toBeUndefined();
    const provider = Provider.create({
      extId: 'provider-extid',
      name: 'provider-name',
      configuration: {},
      type: [ProviderContentType.CHANNELS],
      subscription: true,
      format: ProviderNumberFormat.INTEGER,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      mtSlug: 'prod_vod_Provider',
    }, 'provider-id');

    channel.updateProvider(provider);
    expect(channel.provider).toBeDefined();
    expect(channel.provider?.id).toEqual('provider-id');
    expect(channel.provider).toEqual(provider);
  });

  it('should update EPG', async () => {
    expect(channel.epg).toBeUndefined();
    const epg = EPG.create({
      extId: 'epg-extid',
      name: 'epg-name',
      thumbnail: 'epg/epgid/thumbnail.png',
      programs: [],
      epgTemplate: '',
      ingestionUrl: '',
      ingestionSchedule: '0 8 ? 1-12 1-7 *',
      timezone: '',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'epg-id');

    channel.updateEPG(epg);
    expect(channel.epg).toBeDefined();
    expect(channel.epg?.id).toEqual('epg-id');
    expect(channel.epg).toEqual(epg);
  });

  it('should add Platform to Channel', async () => {
    expect(channel.platforms?.length).toEqual(0);
    const platform = Platform.create({
      extId: 'platform-extid',
      name: 'platform-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'platform-id');
    channel.addPlatform(platform);

    expect(channel.platforms?.length).toEqual(1);
    if (!channel.platforms) return;
    expect(channel.platforms[0]).toEqual(platform);
  });

  it('should add Category to Channel', async () => {
    expect(channel.categories?.length).toEqual(0);
    const category = Category.create({
      extId: 'category-extid',
      name: 'category-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'category-id');
    channel.addCategory(category);

    expect(channel.categories?.length).toEqual(1);
    if (!channel.categories) return;
    expect(channel.categories[0]).toEqual(category);
  });

  it('should add Package to Channel', async () => {
    expect(channel.packages?.length).toEqual(0);
    const packageItem = Package.create({
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
    channel.addPackage(packageItem);

    expect(channel.packages?.length).toEqual(1);
    if (!channel.packages) return;
    expect(channel.packages[0]).toEqual(packageItem);
  });

  it('should add Genre to Channel', async () => {
    expect(channel.genres?.length).toEqual(0);
    const genre = Genre.create({
      weight: 0,
      extId: 'genre-extid',
      name: 'genre-name',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'genre-id');
    channel.addGenre(genre);

    expect(channel.genres?.length).toEqual(1);
    if (!channel.genres) return;
    expect(channel.genres[0]).toEqual(genre);
  });

  it('should add Location to Channel', async () => {
    expect(channel.locations?.length).toEqual(0);
    const location = Location.create({
      slug: 'location-extid',
      extId: 'location-extid',
      name: 'location-name',
      type: LocationType.PACKAGE,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'location-id');
    channel.addLocation(location);

    expect(channel.locations?.length).toEqual(1);
    if (!channel.locations) return;
    expect(channel.locations[0]).toEqual(location);
  });

  it('should add Stream to Channel', async () => {
    expect(channel.streams?.length).toEqual(0);
    const stream = Stream.create({
      extId: 'stream-extid',
      name: 'stream-name',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: 'data',
      daiParams: true,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      weight: 0,
    }, 'stream-id');
    channel.addStream(stream);

    expect(channel.streams?.length).toEqual(1);
    if (!channel.streams) return;
    expect(channel.streams[0]).toEqual(stream);
  });

  it('should add Distributor to Channel', async () => {
    expect(channel.distributors?.length).toEqual(0);
    const distributor = Distributor.create({
      name: 'distributor-name',
      id: 15,
      code: 'code',
      type: {
        name: 'dist',
        slug: 'DST',
        payout_flag: true,
      },
      custom_affiliate_tags: [],
    });
    channel.addDistributor(distributor);

    expect(channel.distributors?.length).toEqual(1);
    if (!channel.distributors) return;
    expect(channel.distributors[0]).toEqual(distributor);
  });

  it('should add Brand to Channel', async () => {
    expect(channel.brands?.length).toEqual(0);
    const brand = Brand.create({
      name: 'brand-name',
      site_id: 15,
      slug: 'brand-slug',
      domain: 'brand-domain',
      active: true,
      logo_image: '',
      logo_image_dark: '',
    });
    channel.addBrand(brand);

    expect(channel.brands?.length).toEqual(1);
    if (!channel.brands) return;
    expect(channel.brands[0]).toEqual(brand);
  });
});
