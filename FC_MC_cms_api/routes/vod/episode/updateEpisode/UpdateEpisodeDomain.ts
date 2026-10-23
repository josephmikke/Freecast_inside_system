import { LogEntity, LogEvent } from '../../../shared/dto/LogDto';
import { StreamProps } from '../../../shared/dto/StreamDto';
import { EpisodeDto, EpisodeRequestDto, UpdateEpisodeBody } from '../../../shared/dto/vod/EpisodeDto';
import ICDNAdaptor from '../../../shared/interfaces/ICDNAdaptor';
import { IFactory } from '../../../shared/interfaces/IFactory';
import { IStorageAdaptor } from '../../../shared/interfaces/IStorageAdaptor';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Thumbnail from '../../../shared/valueObjects/Thumbnail';
import { StreamError } from '../../../stream/shared/StreamError';
import { ISeriesRepository } from '../../series/shared/ISeriesRepository';
import Episode from '../shared/Episode';
import { EpisodeError } from '../shared/EpisodeError';
import EpisodeFactory from '../shared/EpisodeFactory';
import { IEpisodeRepository } from '../shared/IEpisodeRepository';

import { IUpdateEpisodeDomain } from './IUpdateEpisodeDomain';

export default class UpdateEpisodeDomain implements IUpdateEpisodeDomain {
  private readonly repository: IEpisodeRepository;

  private readonly episodeFactory: IFactory<Episode, EpisodeRequestDto, EpisodeDto>;

  constructor(
    repository: IEpisodeRepository,
    episodeFactory: IFactory<Episode, EpisodeRequestDto, EpisodeDto>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly seriesRepository: ISeriesRepository,
    private readonly cdnAdaptor: ICDNAdaptor,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.episodeFactory = episodeFactory;
  }

  private static isExternalIdDifferent(original: Episode, updated: Partial<EpisodeRequestDto>) {
    return updated.extId && original.extId !== updated.extId;
  }

  private async updateNewProps(episode: Episode, newProps: Partial<EpisodeRequestDto>) {
    // We replace base64 payload by image path is an update is required
    let pathThumbnail = episode.thumbnail.value();
    let pathAlternateThumbnail = episode.alternateThumbnail?.value();
    const modifiedThumbnails = [];

    if (newProps.thumbnail) {
      const thumbnail = new Thumbnail(newProps.thumbnail);
      pathThumbnail = await this.fileStorage.store(
        `episodes/${episode.id}`,
        thumbnail.value(),
        'thumbnail',
      );
      await modifiedThumbnails.push(`/${pathThumbnail}`);
    }
    if (newProps.alternateThumbnail) {
      const thumbnail = new Thumbnail(newProps.alternateThumbnail);
      pathAlternateThumbnail = await this.fileStorage.store(
        `episodes/${episode.id}`,
        thumbnail.value(),
        'alternate-thumbnail',
      );
      await modifiedThumbnails.push(`/${pathAlternateThumbnail}`);
    }

    try {
      await this.cdnAdaptor.invalidateCache(modifiedThumbnails);
    } catch (e) {
      console.error(e);
    }
    return {
      ...newProps,
      thumbnail: pathThumbnail,
      alternateThumbnail: pathAlternateThumbnail,
      updatedAt: new Date().toISOString(),
    };
  }

  static streamHasId(streamProp: Partial<StreamProps>): boolean {
    return 'id' in streamProp;
  }

  static isValidStreamProps(streamProp: Partial<StreamProps>): boolean {
    return 'name' in streamProp && 'type' in streamProp && 'format' in streamProp && 'data' in streamProp && 'daiParams' in streamProp;
  }

  private async updateNewStreams(episode: Episode, newProps: UpdateEpisodeBody) {
    const { streams } = episode;

    if (streams === undefined) throw new EpisodeError.UnableToUpdateEpisode();

    if (newProps.streams) {
      const existingStreams = streams.filter(
        (stream) => newProps.streams?.includes(stream.id),
      ) ?? [];
      const newStreams = (newProps.streams.filter(
        (stream) => typeof stream !== 'string',
      ) as Array<Partial<StreamProps>>).map(
        (stream) => {
          if (UpdateEpisodeDomain.streamHasId(stream)) {
            const existingStream = streams.find((streamItem) => streamItem.id === stream.id);

            if (existingStream) {
              return {
                ...existingStream,
                ...stream,
                updatedAt: new Date().toISOString(),
              };
            }
            throw new StreamError.UnknownStreamDependency(`${stream.id} not found.`);
          } else if (UpdateEpisodeDomain.isValidStreamProps(stream)) {
            return stream;
          }
          throw new StreamError.MalformedStreamDependency();
        },
      ) as Array<StreamProps>;
      return [...existingStreams, ...newStreams];
    }
    return streams;
  }

  async updateEpisode(id: string, newProps: Partial<EpisodeRequestDto>): Promise<void> {
    const episode = await this.repository.findOne(id);
    if (!episode) {
      throw new EpisodeError.EpisodeNotFound();
    }
    const props = await this.updateNewProps(episode, newProps);
    if (UpdateEpisodeDomain.isExternalIdDifferent(episode, props)) {
      const updatedEpisode = Object.assign({}, episode, props);
      if (await this.repository.exists(updatedEpisode)) {
        throw new EpisodeError.EpisodeAlreadyExist();
      }
    }
    const updatedEpisodeDto = Object.assign(
      {},
      this.episodeFactory.toPersistence(episode),
      props,
    );
    const series = await this.seriesRepository.findOne(updatedEpisodeDto.seriesId);

    if (!series) {
      throw new EpisodeError.SeriesNotFound('Series not Found.');
    }
    const updatedStreams = await this.updateNewStreams(episode, props);
    try {
      await this.repository.remove(episode);
      const updatedEpisode = await this.episodeFactory.toDomain({
        ...updatedEpisodeDto,
        streams: updatedStreams,
        isIngest: false,
      });
      const isUpdated = await this.repository.save(updatedEpisode);
      if (!isUpdated) throw new EpisodeError.UnableToUpdateEpisode();
      await this.logTracker.track({
        event: LogEvent.UPDATE,
        entity: LogEntity.EPISODE,
        entityId: updatedEpisode.id,
      });
    } catch (e) {
      await (this.episodeFactory as EpisodeFactory).removeStreams();
      const originalEpisode = await this.episodeFactory.toDomain({
        ...this.episodeFactory.toPersistence(episode),
        streams: episode.streams ?? [],
      });
      await this.repository.save(originalEpisode);
      throw e;
    }
  }
}
