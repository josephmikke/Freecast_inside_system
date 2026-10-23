import { LogEntity, LogEvent } from '../../../shared/dto/LogDto';
import { EpisodeDto, EpisodeRequestDto } from '../../../shared/dto/vod/EpisodeDto';
import { IFactory } from '../../../shared/interfaces/IFactory';
import { IStorageAdaptor } from '../../../shared/interfaces/IStorageAdaptor';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import { ISeriesRepository } from '../../series/shared/ISeriesRepository';
import Episode from '../shared/Episode';
import { EpisodeError } from '../shared/EpisodeError';
import EpisodeFactory from '../shared/EpisodeFactory';
import { IEpisodeRepository } from '../shared/IEpisodeRepository';

import { IAddEpisodeDomain } from './IAddEpisodeDomain';

export default class AddEpisodeDomain implements IAddEpisodeDomain {
  private readonly repository: IEpisodeRepository;

  private readonly episodeFactory: IFactory<Episode, EpisodeRequestDto, EpisodeDto>;

  constructor(
    repository: IEpisodeRepository,
    episodeFactory: IFactory<Episode, EpisodeRequestDto, EpisodeDto>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly seriesRepository: ISeriesRepository,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.episodeFactory = episodeFactory;
  }

  async addNewEpisode(episodeDto: EpisodeRequestDto): Promise<Episode> {
    try {
      const series = await this.seriesRepository.findOne(episodeDto.seriesId);

      if (!series) {
        throw new EpisodeError.SeriesNotFound('Series not Found.');
      }

      const episode = await this.episodeFactory.toDomain(episodeDto);

      if (await this.repository.exists(episode)) {
        (this.episodeFactory as EpisodeFactory).removeStreams();
        throw new EpisodeError.EpisodeAlreadyExist();
      }
      try {
        const pathThumbnail = await this.fileStorage.store(`episodes/${episode.id}`, episode.thumbnail.value(), 'thumbnail');
        episode.updateThumbnail(pathThumbnail);
      } catch (e) {
        (this.episodeFactory as EpisodeFactory).removeStreams();
        throw new EpisodeError.UnableToSaveThumbnail();
      }
      try {
        if (episode.alternateThumbnail) {
          const pathAlternateThumbnail = await this.fileStorage.store(`episodes/${episode.id}`, episode.alternateThumbnail.value(), 'alternate-thumbnail');
          episode.updateAlternateThumbnail(pathAlternateThumbnail);
        }
      } catch (e) {
        (this.episodeFactory as EpisodeFactory).removeStreams();
        throw new EpisodeError.UnableToSaveThumbnail();
      }
      await this.repository.save(episode);
      await series.addEpisode(episode);
      const seriesItem = await this.seriesRepository.getFactory().toPersistence(series);
      await this.seriesRepository.updateEpisodes(series.id, seriesItem.episodes ?? []);
      await this.logTracker.track({
        event: LogEvent.INSERT,
        entity: LogEntity.EPISODE,
        entityId: episode.id,
      });
      return episode;
    } catch (e) {
      (this.episodeFactory as EpisodeFactory).removeStreams();
      throw e;
    }
  }
}
