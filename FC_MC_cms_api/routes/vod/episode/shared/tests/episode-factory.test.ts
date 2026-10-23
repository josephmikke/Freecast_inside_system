import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../../utils/database-table-utils';
import { Rating } from '../../../../asset/shared/Rating';
import Stream from '../../../../stream/shared/Stream';
import StreamFactory from '../../../../stream/shared/StreamFactory';
import StreamRepository from '../../../../stream/shared/StreamRepository';
import { EpisodeRequestDto } from '../../../../shared/dto/vod/EpisodeDto';
import { StreamFormat, StreamType } from '../../../../shared/dto/StreamDto';
import Episode from '../Episode';
import { EpisodeError } from '../EpisodeError';
import EpisodeFactory from '../EpisodeFactory';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const TEST_TABLE_NAME = 'test-episodeFactory';

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

describe('EpisodeFactory', () => {
  let episodeDto: EpisodeRequestDto;
  let episode: Episode;
  let stream: Stream;
  let episodeFactory: EpisodeFactory;

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

    episodeDto = {
      extId: 'episode-extId',
      description: 'Test episode',
      name: 'Reelz_SD',
      rating: Rating.TV_14,
      availableDate: '2022-11-10T17:10:000Z',
      expirationDate: '2023-11-10T17:10:000Z',
      slug: 'reelz-sd',
      season: '1',
      number: 1,
      duration: '00:59:00',
      contentData: 'data',
      originalAirDate: '2023-11-10T17:10:000Z',
      thumbnail: 'episodes/episodeid/thumbnail.png',
      alternateThumbnail: 'episodes/episodeid/thumbnail.png',
      streams: [],
      seriesId: 'seriesId',
    };

    episodeFactory = new EpisodeFactory(
      uidEpisode,
      streamRepository,
      'default/nothumbnail/thumbnail.png',
    );

    await streamRepository.save(stream);
  });

  afterAll(async () => {
    await streamRepository.remove(stream);
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('toDomain - should throw because of unknown stream', async () => {
    await expect(async () => episodeFactory.toDomain({
      ...episodeDto,
      streams: ['streamidunknown'],
    })).rejects.toThrowError(EpisodeError.UnknownEpisodeDependency);
  });

  it('toDomain - should create a Episode instance', async () => {
    episode = await episodeFactory.toDomain({
      ...episodeDto,
      streams: [stream.id],
    });

    expect(episode).toBeDefined();
    expect(episode.id).toEqual('my-episode-id');
  });

  it('toDomain - should create a new Stream from StreamProps', async () => {
    const newStream = {
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
      streams: [newStream],
    });

    expect(episode).toBeDefined();
    expect(episode.id).toEqual('my-episode-id');
    expect(episode.streams?.length).toEqual(1);
    if (!episode.streams) return;
    expect(await streamRepository.findOne(episode.streams[0].id)).toBeDefined();
  });

  it('toDomain - should throw because Stream extId already exists', async () => {
    const newStream = {
      name: 'my-new-episode-stream-2',
      extId: 'new-episode-stream',
      type: StreamType.EMBED_CODE,
      format: StreamFormat.DASH,
      data: 'data2',
      daiParams: false,
      weight: 1,
    };
    const stream2 = {
      name: 'my-new-episode-stream-2',
      extId: 'new-episode-stream',
      type: StreamType.EMBED_CODE,
      format: StreamFormat.DASH,
      data: 'data2',
      daiParams: false,
      weight: 1,
    };

    await expect(async () => episodeFactory.toDomain({
      ...episodeDto,
      streams: [newStream, stream2],
    })).rejects.toThrowError(EpisodeError.EpisodeStreamCreation);
  });

  it('toDomain - should create a Episode instance', async () => {
    episode = await episodeFactory.toDomain({
      ...episodeDto,
      streams: [stream.id],
    });

    expect(episode).toBeDefined();
    expect(episode.id).toEqual('my-episode-id');
  });

  it('toPersistance - should return correct ids', async () => {
    const resEpisode = episodeFactory.toPersistence(episode);

    expect(resEpisode).toBeDefined();
    expect(resEpisode.id).toEqual('my-episode-id');
    expect(resEpisode.streams).toContain('stream-id');
  });
});
