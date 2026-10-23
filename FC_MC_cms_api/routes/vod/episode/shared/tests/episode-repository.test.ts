import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import HttpClientAdaptor from '../../../../epg/shared/HttpClientAdaptor';
import ImageAdaptor from '../../../shared/imageAdaptor/ImageAdaptor';
import DynamoDBTableUtils from '../../../../../utils/database-table-utils';
import { MrssType } from '../../../../shared/dto/MrssDto';
import { Rating } from '../../../../asset/shared/Rating';
import { StreamFormat, StreamProps, StreamType } from '../../../../shared/dto/StreamDto';
import Stream from '../../../../stream/shared/Stream';
import StreamFactory from '../../../../stream/shared/StreamFactory';
import StreamRepository from '../../../../stream/shared/StreamRepository';
import Episode from '../Episode';
import EpisodeFactory from '../EpisodeFactory';
import EpisodeRepository from '../EpisodeRepository';
import { SortType, SortOrder } from '../../../../shared/dto/ChannelDto';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const TEST_TABLE_NAME = 'test-episodeRepository';

const uid = new UIDGenerator();

const uidEpisode = {
  generate: () => 'my-episode-id',
};

const streamFactory = new StreamFactory(uid);
const streamRepository = new StreamRepository(
  ddbClient,
  TEST_TABLE_NAME,
  streamFactory,
);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const episodeFactory = new EpisodeFactory(
  uidEpisode,
  streamRepository,
  'default/nothumbnail/thumbnail.png',
);

const episodeRepository = new EpisodeRepository(ddbClient, TEST_TABLE_NAME, episodeFactory);

const episodeFactoryRdm = new EpisodeFactory(
  uid,
  streamRepository,
  'default/nothumbnail/thumbnail.png',
);

const episodeDto = {
  extId: 'episode-extId',
  catchUpActive: false,
  description: 'Test episode',
  name: 'Reelz_SD',
  rating: Rating.TV_MA,
  availableDate: '2022-11-10T17:10:000Z',
  expirationDate: '2023-11-10T17:10:000Z',
  slug: 'reelz-sd',
  season: '1',
  number: 1,
  duration: '00:59:00',
  contentData: 'data',
  originalAirDate: '2023-11-10T17:10:000Z',
  mediapackageId: 'mediapackage-id',
  thumbnail: 'episodes/episodeid/thumbnail.png',
  alternateThumbnail: 'episodes/episodeid/thumbnail.png',
  streams: [],
};

describe('EpisodeRepository - Empty database', () => {
  const episode = Episode.create({
    ...episodeDto,
    createdAt: '2022-10-17T00:00:00.000Z',
    updatedAt: '2022-10-17T00:00:00.000Z',
    extId: episodeDto.extId ?? '',
    season: '1',
    number: 1,
    duration: '00:59:00',
    contentData: 'data',
    originalAirDate: '2023-11-10T17:10:000Z',
    seriesId: 'seriesId',
    cast: '',
    enabled: true,
    isIngest: false,
  }, 'episode-id');

  beforeEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('should check if a Episode exists and return false', async () => {
    expect(await episodeRepository.exists(episode)).toBeFalsy();
  });

  it('should return all an empty array', async () => {
    expect(await episodeRepository.findAll()).toEqual({ episodes: [], nextToken: undefined });
  });

  it('should return false if not relationships are found', async () => {
    expect(await episodeRepository.hasRelationships(episode)).toBeFalsy();
  });

  it('should return false if cannot save', async () => {
    expect(await episodeRepository.save(episode)).toBeTruthy();
  });

  it('should return undefined if not found', async () => {
    expect(await episodeRepository.findOne(episode.id)).toBeUndefined();
  });

  it('should return empty array if not found', async () => {
    expect(await episodeRepository.findMany([episode.id])).toEqual([]);
  });
});

describe('EpisodeRepository - Non-Empty database', () => {
  let episode: Episode;
  let stream: Stream;

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    stream = Stream.create({
      extId: 'provider-extId',
      name: 'Provider Reelz_SD',
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      daiParams: true,
      weight: 1,
      data: 'my-stream-data',
      enabled: true,
    }, 'stream-id');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('save - should save a Episode instance', async () => {
    await streamRepository.save(stream);

    const streamProps: StreamProps = {
      name: 'my-new-episode-stream',
      extId: 'new-episode-stream',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: 'data',
      daiParams: true,
      weight: 1,
    };

    episode = await episodeFactory.toDomain({
      ...episodeDto,
      streams: [stream.id, streamProps],
      seriesId: 'seriesId',
    });

    expect(await episodeRepository.save(episode)).toBeTruthy();
  });

  it('findOne - should get previously saved Episode instance', async () => {
    const resultEpisode = await episodeRepository.findOne(episode.id);

    expect(resultEpisode).toBeDefined();
    expect(resultEpisode?.id).toEqual(episode.id);
  });

  it('findAll - should get previously saved Episode instances', async () => {
    const episode2 = await episodeFactoryRdm.toDomain({
      ...episodeDto,
      streams: [stream.id],
      name: 'episode_name_123',
      slug: 'value_episode',
      availableDate: '2022-09-17T00:00:00.000Z',
      expirationDate: '2022-11-17T00:00:00.000Z',
      createdAt: '2022-09-17T00:00:00.000Z',
      updatedAt: '2022-11-17T00:00:00.000Z',
      seriesId: 'seriesId',
    });
    await episodeRepository.save(episode2);

    // Default: sort by Name, ascending order
    let resultEpisode = await episodeRepository.findAll();

    expect(resultEpisode.episodes.length).toEqual(2);
    expect(resultEpisode.episodes[0].name).toEqual(episode2.name);

    // sort by Name, ascending order
    resultEpisode = await episodeRepository.findAll({
      sort: {
        attr: SortType.NAME,
        order: SortOrder.ASC,
      },
    });

    expect(resultEpisode.episodes.length).toEqual(2);
    expect(resultEpisode.episodes[0].name).toEqual(episode2.name);

    // sort by Name, descending order
    resultEpisode = await episodeRepository.findAll({
      sort: {
        attr: SortType.NAME,
        order: SortOrder.DESC,
      },
    });

    expect(resultEpisode.episodes.length).toEqual(2);
    expect(resultEpisode.episodes[0].name).toEqual(episode.name);

    // sort by Id (slug), ascending order
    resultEpisode = await episodeRepository.findAll({
      sort: {
        attr: SortType.ID,
        order: SortOrder.ASC,
      },
    });

    expect(resultEpisode.episodes.length).toEqual(2);
    expect(resultEpisode.episodes[0].slug).toEqual(episode.slug);

    // sort by Id (slug), descending order
    resultEpisode = await episodeRepository.findAll({
      sort: {
        attr: SortType.ID,
        order: SortOrder.DESC,
      },
    });

    expect(resultEpisode.episodes.length).toEqual(2);
    expect(resultEpisode.episodes[0].slug).toEqual(episode2.slug);

    // sort by creation date, ascending order
    resultEpisode = await episodeRepository.findAll({
      sort: {
        attr: SortType.CREATED,
        order: SortOrder.ASC,
      },
    });

    expect(resultEpisode.episodes.length).toEqual(2);
    expect(resultEpisode.episodes[0].createdAt).toEqual(episode2.createdAt);

    // sort by creation date, descending order
    resultEpisode = await episodeRepository.findAll({
      sort: {
        attr: SortType.CREATED,
        order: SortOrder.DESC,
      },
    });

    expect(resultEpisode.episodes.length).toEqual(2);
    expect(resultEpisode.episodes[0].createdAt).toEqual(episode.createdAt);

    // sort by updated date, ascending order
    resultEpisode = await episodeRepository.findAll({
      sort: {
        attr: SortType.UPDATED,
        order: SortOrder.ASC,
      },
    });

    expect(resultEpisode.episodes.length).toEqual(2);
    expect(resultEpisode.episodes[0].updatedAt).toEqual(episode.updatedAt);

    // sort by updated date, descending order
    resultEpisode = await episodeRepository.findAll({
      sort: {
        attr: SortType.UPDATED,
        order: SortOrder.DESC,
      },
    });

    expect(resultEpisode.episodes.length).toEqual(2);
    expect(resultEpisode.episodes[0].updatedAt).toEqual(episode2.updatedAt);

    // Default: sort by Name, ascending order, with search
    resultEpisode = await episodeRepository.findAll({
      search: 'name',
    });

    expect(resultEpisode.episodes.length).toEqual(1);
    expect(resultEpisode.episodes[0].name).toEqual(episode2.name);

    // Default: sort by Name, ascending order, with unknown search
    resultEpisode = await episodeRepository.findAll({
      search: 'unknown',
    });

    expect(resultEpisode.episodes.length).toEqual(0);

    // Default: sort visible, ascending order
    resultEpisode = await episodeRepository.findAll({
      filter: {
        active: true,
      },
    });

    expect(resultEpisode.episodes.length).toEqual(1);
    expect(resultEpisode.episodes[0].name).toEqual(episode2.name);

    // Default: sort visible, ascending order
    resultEpisode = await episodeRepository.findAll({
      filter: {
        active: false,
      },
    });

    expect(resultEpisode.episodes.length).toEqual(1);
    expect(resultEpisode.episodes[0].name).toEqual(episode.name);

    // Default: sort visible + name, ascending order
    resultEpisode = await episodeRepository.findAll({
      filter: {
        active: true,
      },
      search: 'name',
    });

    expect(resultEpisode.episodes.length).toEqual(1);
    expect(resultEpisode.episodes[0].name).toEqual(episode2.name);

    // Default: sort visible + name, ascending order
    resultEpisode = await episodeRepository.findAll({
      filter: {
        active: true,
      },
      search: 'namenotexisting',
    });

    expect(resultEpisode.episodes.length).toEqual(0);

    // Default: sort visible + name, ascending order
    resultEpisode = await episodeRepository.findAll({
      search: 'reel',
    });

    expect(resultEpisode.episodes.length).toEqual(1);
    expect(resultEpisode.episodes[0].name).toEqual(episode.name);

    // Limit parameter
    resultEpisode = await episodeRepository.findAll({
      limit: 2,
    });
    expect(resultEpisode.episodes.length).toEqual(2);
    const token = {
      SK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#my-episode-id`,
      'GSI1-SK': 'reelz_sd',
      PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#my-episode-id`,
      'GSI1-PK': `ASSET#${EpisodeRepository.ROOT_ENTITY}`,
    };
    expect(resultEpisode.nextToken).toEqual(Buffer.from(JSON.stringify(token)).toString('base64'));
    resultEpisode = await episodeRepository.findAll({
      nextToken: resultEpisode.nextToken,
    });
    expect(resultEpisode.episodes).toHaveLength(0);
    expect(resultEpisode.nextToken).toBeUndefined();

    await episodeRepository.save(await episodeFactoryRdm.ingestToDomain({
      guid: 'my-movie-guid',
      extId: 'my-movie-guid',
      title: 'movie number one test',
      thumbnails: [],
      pubDate: 'string',
      description: 'string',
      type: MrssType.EPISODE,
      asset: {
        height: '1080',
        width: '1920',
        duration: '60',
        type: 'video/mp4',
        url: 'https://partnerfeeds.besteverchannels.com/SelectTV/assets/the-supermodel-8eb1119a.mp4',
      },
      avail: {
        start: '2022-09-17T00:00:00.000Z',
        end: '2022-09-23T00:00:00.000Z',
      },
      subtitles: [],
      cuePoints: [],
      seriesId: '',
      genres: [],
      season: '1',
      episode: '1',
      episodeAltThumbnail: {},
      episodeMainThumbnail: {},
    }, new ImageAdaptor(new HttpClientAdaptor())));
    const allEpisodes = await episodeRepository.findAll();
    expect(allEpisodes.episodes.length).toEqual(3);
  });

  it('findMany - should get previously saved Episode instances', async () => {
    const resultEpisode = await episodeRepository.findMany([episode.id]);

    expect(resultEpisode.length).toBeGreaterThan(0);
    expect(resultEpisode[0].id).toEqual(episode.id);
  });

  it('remove - should remove previously saved Episode instances', async () => {
    expect(await episodeRepository.remove(episode)).toBeTruthy();

    const resultEpisode = await episodeRepository.findOne(episode.id);
    expect(resultEpisode).toBeUndefined();
  });
});

describe.each([
  (payload: Episode) => episodeRepository.remove(payload),
  (payload: Episode) => episodeRepository.save(payload),
  (payload: Episode) => episodeRepository.exists(payload),
  (payload: Episode) => episodeRepository.hasRelationships(payload),
  (id: string) => episodeRepository.findOne(id),
  // () => episodeRepository.findMany([]),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
