import { LogEntity, LogEvent } from '../../../shared/dto/LogDto';
import { IPublisher } from '../../../shared/interfaces/IPublisher';
import { IStorageAdaptor } from '../../../shared/interfaces/IStorageAdaptor';
import { PublisherEvent } from '../../../shared/PublisherAdaptor';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import { ISeriesRepository } from '../shared/ISeriesRepository';
import { SeriesError } from '../shared/SeriesError';

import { IDeleteSeriesDomain } from './IDeleteSeriesDomain';

export default class DeleteSeriesDomain implements IDeleteSeriesDomain {
  constructor(
    private readonly repository: ISeriesRepository,
    private readonly fileStorage: IStorageAdaptor,
    private readonly publisherAdaptor: IPublisher<PublisherEvent>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

  async deleteSeries(id: string): Promise<void> {
    const series = await this.repository.findOne(id);
    if (!series) throw new SeriesError.SeriesNotFound();

    if (await this.repository.hasRelationships(series)) {
      throw new SeriesError.SeriesHasDependencies();
    }
    await this.fileStorage.remove(series.thumbnail.value());
    if (series.alternateThumbnail) {
      await this.fileStorage.remove(series.alternateThumbnail.value());
    }
    if (series.backgroundThumbnail) {
      await this.fileStorage.remove(series.backgroundThumbnail.value());
    }
    const deleted = await this.repository.remove(series);
    if (!deleted) throw new SeriesError.UnableToRemoveSeries();
    await this.publisherAdaptor.publish({
      eventType: 'SERIES_DELETE',
      payload: series.id,
    });
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.SERIES,
      entityId: series.id,
    });
  }
}
