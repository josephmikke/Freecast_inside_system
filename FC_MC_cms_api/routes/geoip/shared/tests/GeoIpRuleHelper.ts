import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import ProviderMap from '../../../provider/shared/ProviderMap';
import ProviderRepository from '../../../provider/shared/ProviderRepository';
import EPGTemplateFactory from '../../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../../epgTemplate/shared/EPGTemplateRepository';
import EPGProgramBuilder from '../../../epg/shared/EPGProgramBuilder';
import EPGFactory from '../../../epg/shared/EPGFactory';
import EPGRepository from '../../../epg/shared/EPGRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import CategoryMap from '../../../category/shared/CategoryMap';
import CategoryRepository from '../../../category/shared/CategoryRepository';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import GenreMap from '../../../genre/shared/GenreMap';
import GenreRepository from '../../../genre/shared/GenreRepository';
import LocationFactory from '../../../location/shared/LocationFactory';
import LocationRepository from '../../../location/shared/LocationRepository';
import StreamFactory from '../../../stream/shared/StreamFactory';
import StreamRepository from '../../../stream/shared/StreamRepository';
import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../utils/in-memory-relation-repositories';
import ChannelFactory from '../../../channel/shared/ChannelFactory';
import ChannelRepository from '../../../channel/shared/ChannelRepository';
import { MovieRating, Rating } from '../../../asset/shared/Rating';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import Package from '../../../package/shared/Package';
import Provider from '../../../provider/shared/Provider';
import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import MovieFactory from '../../../vod/movie/shared/MovieFactory';
import MovieRepository from '../../../vod/movie/shared/MovieRepository';
import SeriesFactory from '../../../vod/series/shared/SeriesFactory';
import SeriesRepository from '../../../vod/series/shared/SeriesRepository';
import EpisodeFactory from '../../../vod/episode/shared/EpisodeFactory';
import EpisodeRepository from '../../../vod/episode/shared/EpisodeRepository';
import { StreamFormat, StreamType } from '../../../shared/dto/StreamDto';

interface Props {
  pkg?: Package[];
  mediaPackageId?: string;
}

export default async (TEST_TABLE_NAME: string, ddbClient: DynamoDBClient, props: Props) => {
  const uid = new UIDGenerator();

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

  const categoryMap = new CategoryMap(uid);
  const categoryRepository = new CategoryRepository(ddbClient, TEST_TABLE_NAME, categoryMap);

  const packageFactory = new PackageFactory(uid, platformRepository);
  const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);

  const genreMap = new GenreMap(uid);
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
    'default/nothumbnail/thumbnail.png',
  );

  const episodeFactory = new EpisodeFactory(
    uid,
    streamRepository,
    'default/nothumbnail/thumbnail.png',
  );

  const episodeRepository = new EpisodeRepository(ddbClient, TEST_TABLE_NAME, episodeFactory);

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
    'default/nothumbnail/thumbnail.png',
  );

  const seriesRepository = new SeriesRepository(ddbClient, TEST_TABLE_NAME, seriesFactory);

  const movieRepository = new MovieRepository(ddbClient, TEST_TABLE_NAME, movieFactory);

  const channelRepository = new ChannelRepository(ddbClient, TEST_TABLE_NAME, channelFactory);

  const provider = Provider.create({
    extId: 'provider-extId',
    name: 'Provider Reelz_SD',
    createdAt: '2022-10-17T00:00:00.000Z',
    updatedAt: '2022-10-17T00:00:00.000Z',
    configuration: {},
    type: [ProviderContentType.CHANNELS],
    subscription: true,
    format: ProviderNumberFormat.INTEGER,
    enabled: true,
  }, 'provider-id');

  const channelUid = uid.generate(4);
  const channelDto = {
    extId: `channel-${channelUid}`,
    catchUpActive: false,
    description: 'Test channel',
    lcn: 1007,
    name: `Reelz-${channelUid}`,
    rating: Rating.TV_Y7FV,
    availableDate: '2022-11-10T17:10:000Z',
    slug: `reelz-${channelUid}`,
    vastId: '',
    visible: true,
    mediapackageId: props.mediaPackageId,
    provider: provider.id,
    thumbnail: 'channels/channelid/thumbnail.png',
    packages: props.pkg?.map((pkg) => pkg.id) || [],
    categories: [],
    streams: [],
    exclude: props.pkg ? 'categories,streams' : 'categories,streams,packages',
  };
  await providerRepository.save(provider);
  const channel = await channelFactory.toDomain(channelDto);
  await channelRepository.save(channel);

  const movie = await movieFactory.toDomain({
    availableDate: '17/10/2023',
    backgroundThumbnail: 'channels/channelid/thumbnail.png',
    brands: ['118'],
    description: 'This is a test movie',
    name: 'Star Wars',
    packages: props.pkg?.map((pkg) => pkg.id) || [],
    provider: provider.id,
    rating: MovieRating.NC_17,
    slug: 'movie-test',
    streams: [{
      name: 'stream',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: `https://d1d9aflu78lyvz.cloudfront.net/out/v1/${uid.generate(8)}/9a9060ba6c984ccfbe2b27c705a657d3/28da31c18d2d4a38a17c5a829dc95731/index.mpd`,
      daiParams: true,
    }],
    thumbnail: 'channels/channelid/thumbnail.png',
  });

  const series = await seriesFactory.toDomain({
    availableDate: '17/10/2023',
    backgroundThumbnail: 'series/test/thumbnail.png',
    brands: ['118'],
    description: 'This is a test series',
    name: 'Game Of Thrones',
    packages: props.pkg?.map((pkg) => pkg.id) || [],
    provider: provider.id,
    rating: MovieRating.NC_17,
    slug: 'series-test',
    thumbnail: 'series/test/thumbnail.png',
  });

  await seriesRepository.save(series);

  const episode = await episodeRepository.getFactory().toDomain({
    availableDate: '17/10/2023',
    name: 'First Episode',
    number: 1,
    originalAirDate: '17/10/2023',
    rating: Rating.TV_MA,
    season: '1',
    seriesId: series.id,
    slug: 'test-episode',
    streams: [{
      name: 'stream',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: `https://d1d9aflu78lyvz.cloudfront.net/out/v1/${uid.generate(8)}/series/28da31c18d2d4a38a17c5a829dc95731/index.mpd`,
      daiParams: true,
    }],
    thumbnail: 'series/test/thumbnail.png',
  });

  await episodeRepository.save(episode);
  await seriesRepository.updateEpisodes(series.id, [episode.id]);
  await movieRepository.save(movie);
  return {
    channel, channelRepository, movieRepository, seriesRepository,
  };
};
