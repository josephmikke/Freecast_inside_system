import { LogEntity, LogEvent } from '../../../shared/dto/LogDto';
import { IStorageAdaptor } from '../../../shared/interfaces/IStorageAdaptor';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import { ISeriesRepository } from '../../series/shared/ISeriesRepository';
import { EpisodeError } from '../shared/EpisodeError';
import { IEpisodeRepository } from '../shared/IEpisodeRepository';

import { IDeleteEpisodeDomain } from './IDeleteEpisodeDomain';

export default class DeleteEpisodeDomain implements IDeleteEpisodeDomain {
  constructor(
    private readonly repository: IEpisodeRepository,
    private readonly seriesRepository: ISeriesRepository,
    private readonly fileStorage: IStorageAdaptor,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

  async deleteEpisode(id: string): Promise<void> {
    const episode = await this.repository.findOne(id);
    if (!episode) throw new EpisodeError.EpisodeNotFound();

    const series = await this.seriesRepository.findOne(episode.seriesId);
    if (series) {
      const { episodes } = await this.seriesRepository.getFactory().toPersistence(series);
      if (episodes) {
        await this.seriesRepository
          .updateEpisodes(series.id, episodes?.filter((episodeId) => episode.id !== episodeId));
      }
    }
    await this.fileStorage.remove(episode.thumbnail.value());
    if (episode.alternateThumbnail) {
      await this.fileStorage.remove(episode.alternateThumbnail.value());
    }
    const deleted = await this.repository.remove(episode);
    if (!deleted) throw new EpisodeError.UnableToRemoveEpisode();
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.EPISODE,
      entityId: episode.id,
    });
  }
}
