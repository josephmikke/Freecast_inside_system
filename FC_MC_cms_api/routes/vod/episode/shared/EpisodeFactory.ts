import { PromisePool } from '@supercharge/promise-pool';

import { Rating } from '../../../asset/shared/Rating';
import { IImageAdaptor } from '../../shared/imageAdaptor/IImageAdaptor';
import { MrssEpisode, MrssThumbnail } from '../../../shared/dto/MrssDto';
import { StreamProps } from '../../../shared/dto/StreamDto';
import { EpisodeDto, EpisodeRequestDto } from '../../../shared/dto/vod/EpisodeDto';
import { IFactory } from '../../../shared/interfaces/IFactory';
import { IStreamRepository } from '../../../stream/shared/IStreamRepository';
import Stream from '../../../stream/shared/Stream';
import StreamFactory from '../../../stream/shared/StreamFactory';
import { toISOString } from '../../../../utils/toISOString';

import Episode from './Episode';
import { EpisodeError } from './EpisodeError';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

type AssetWithName = Stream;

export default class EpisodeFactory implements IFactory<Episode, EpisodeRequestDto, EpisodeDto> {
  private readonly uid: UID;

  private readonly streamFactory: StreamFactory;

  private createdStream: Array<Stream> = [];

  static readonly sortByName = (a: AssetWithName, b: AssetWithName) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  };

  constructor(
    uid: UID,
    private readonly streamRepository: IStreamRepository,
    private readonly noThumbnailUrl: string,
  ) {
    this.uid = uid;
    this.streamFactory = new StreamFactory(uid);
  }

  public async removeStreams() {
    await Promise.all(this.createdStream.map(async (stream) => {
      if (!(await this.streamRepository.hasRelationships(stream))) {
        await this.streamRepository.remove(stream);
      }
    }));
  }

  public async addStream(streamProps: Array<StreamProps>): Promise<Array<Stream>> {
    return Promise.all(
      streamProps
        .map(async (stream: StreamProps) => {
          const streamItem = await this.streamFactory.toDomain({
            ...stream,
          });

          if (
            !(await this.streamRepository.exists(streamItem))
            && (await this.streamRepository.findOne(streamItem.id)) === undefined
          ) {
            this.createdStream.push(streamItem);
            await this.streamRepository.save(streamItem);
          } else {
            throw new EpisodeError.EpisodeStreamCreation('Stream exitId or id already taken');
          }
          return streamItem;
        }) ?? [],
    );
  }

  public async handleStreams(relationItems: Array<string | StreamProps>) {
    if (!relationItems?.length) {
      return [];
    }

    const existingStreams = (relationItems.filter((stream: string | StreamProps) => typeof stream === 'string') as Array<string>);
    const newStreams = await Promise.all(
      (relationItems.filter((stream: string | StreamProps) => typeof stream !== 'string') as Array<StreamProps>)
        .map(async (stream: StreamProps) => {
          const streamItem = await this.streamFactory.toDomain({
            ...stream,
          });

          if (
            !(await this.streamRepository.exists(streamItem))
            && (await this.streamRepository.findOne(streamItem.id)) === undefined
          ) {
            this.createdStream.push(streamItem);
            await this.streamRepository.save(streamItem);
          } else {
            throw new EpisodeError.EpisodeStreamCreation('Stream exitId or id already taken');
          }
          return streamItem;
        }) ?? [],
    );

    const streams = await [
      ...(existingStreams.length ? await this.streamRepository.findMany(existingStreams) : []),
      ...newStreams,
    ];

    if (relationItems.length !== streams.length) {
      throw new EpisodeError.UnknownEpisodeDependency('streams');
    }
    return streams.sort(EpisodeFactory.sortByName);
  }

  async ingestToDomain(
    item: MrssEpisode,
    imageAdaptor: IImageAdaptor,
  ): Promise<Episode> {
    console.log('episode ingestToDomain');
    const thumbnails = {
      episodeMainThumbnail: item.episodeMainThumbnail,
      episodeAltThumbnail: item.episodeAltThumbnail,
    };

    const { results } = await PromisePool
      .for(Object.entries(thumbnails))
      .process(async ([key, value]) => {
        if (Object.keys(value).length === 0) {
          return {
            type: key,
            value: undefined,
          };
        }
        await imageAdaptor.ingest((value as MrssThumbnail).url);
        return {
          type: key,
          value: imageAdaptor.value(),
        };
      });
    console.log('episode thumbnails');
    const episodeMainThumbnail = results.find((thumbnail) => thumbnail.type === 'episodeMainThumbnail');
    const episodeAltThumbnail = results.find((thumbnail) => thumbnail.type === 'episodeAltThumbnail');

    const episode = Episode.create({
      seriesId: item.seriesId,
      name: item.title,
      extId: item.extId ?? item.guid,
      slug: item.guid,
      availableDate: item.avail.start,
      description: item.description,
      expirationDate: item.avail.end,
      number: Number(item.episode),
      season: item.season,
      duration: item.asset.duration,
      originalAirDate: item.pubDate,
      rating: item.rating as Rating ?? '' as Rating,
      contentData: JSON.stringify(item),
      thumbnail: episodeMainThumbnail?.value ?? this.noThumbnailUrl,
      cast: item.cast?.join(', ') ?? '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: new Date(item.avail.end) > new Date() ? true : false,
      isIngest: true,
    }, item.guid ?? this.uid.generate(8));

    await episode.updateAlternateThumbnail(
      episodeAltThumbnail?.value ?? this.noThumbnailUrl,
    );
    return episode;
  }

  

  async toDomain(raw: EpisodeDto): Promise<Episode> {

      const episode = Episode.create({
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      createdAt: raw.createdAt ?? new Date().toISOString(),
      extId: raw.extId ?? '',
      duration: raw.duration ?? '',
      expirationDate: toISOString(raw.expirationDate) ?? '',
      description: raw.description ?? '',
      contentData: raw.contentData ?? '',
      cast: raw.cast ?? '',
      enabled: raw.enabled ?? true,
      isIngest: raw.isIngest ?? false,
      ...raw,
    }, raw.id || this.uid.generate(8));

    if (raw.alternateThumbnail) {
      episode.updateAlternateThumbnail(raw.alternateThumbnail);
    }
    this.createdStream = [];
    try {
      episode.streams = await this.handleStreams(raw.streams ?? []);
    } catch (e) {
      await this.removeStreams();
      throw e;
    }
    if (episode.isIngest) return episode;

    if (!episode.streams?.length) throw new EpisodeError.UnknownEpisodeDependency('streams');

    return episode;
  }

  toPersistence(raw: Episode): EpisodeDto {
    return {
      ...raw,
      thumbnail: raw.thumbnail.value(),
      alternateThumbnail: raw.alternateThumbnail?.value(),
      streams: Array.from(raw.streams ?? []).map((stream) => stream.id),
      mediapackageIds: Array.from(raw.mediapackageIds ?? []),
    };
  }
}
