import { Rating } from '../../../../asset/shared/Rating';
import { StreamFormat, StreamType } from '../../../../shared/dto/StreamDto';
import { EpisodeRequestDto } from '../../../../shared/dto/vod/EpisodeDto';
import Stream from '../../../../stream/shared/Stream';
import Episode from '../Episode';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const episodeDto: EpisodeRequestDto = {
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
  cast: 'cast',
  thumbnail: 'episodes/myepisodeid/thumbnail.png',
  alternateThumbnail: 'episodes/myepisodeid/thumbnail.png',
  streams: [],
  seriesId: 'seriesId',
};
let episode: Episode;

describe('Episode creation', () => {
  it('should create a Episode instance', async () => {
    episode = Episode.create({
      ...episodeDto,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      extId: episodeDto.extId ?? '',
      duration: episodeDto.duration ?? '',
      expirationDate: episodeDto.expirationDate ?? '',
      description: episodeDto.description ?? '',
      contentData: episodeDto.contentData ?? '',
      cast: episodeDto.cast ?? '',
      enabled: true,
      isIngest: false,
    }, 'main-episode-id');
    episode.updateAlternateThumbnail('episodes/myepisodeid/thumbnail.png');

    expect(episode).toBeDefined();
  });
});

describe('Episode methods', () => {
  it('should update Episode thumbnail', async () => {
    expect(episode.thumbnail.value()).toEqual('episodes/myepisodeid/thumbnail.png');

    episode.updateThumbnail('path/to/thumbnail.png');

    expect(episode.thumbnail.value()).toEqual('path/to/thumbnail.png');
  });

  it('should update Episode alternate thumbnail', async () => {
    expect(episode.alternateThumbnail?.value()).toEqual('episodes/myepisodeid/thumbnail.png');

    episode.updateAlternateThumbnail('path/to/thumbnail.png');

    expect(episode.alternateThumbnail?.value()).toEqual('path/to/thumbnail.png');
  });

  it('should add Stream to Episode', async () => {
    expect(episode.streams?.length).toEqual(0);
    const stream = Stream.create({
      extId: 'stream-extid',
      name: 'stream-name',
      type: StreamType.STREAM,
      format: StreamFormat.HLS,
      data: 'data',
      daiParams: true,
      weight: 1,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    }, 'stream-id');
    episode.addStream(stream);

    expect(episode.streams?.length).toEqual(1);
    if (!episode.streams) return;
    expect(episode.streams[0]).toEqual(stream);
  });
});
