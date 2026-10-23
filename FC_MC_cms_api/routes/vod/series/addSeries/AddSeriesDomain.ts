import { LogEntity, LogEvent } from '../../../shared/dto/LogDto';
import { SeriesDto, SeriesRequestDto } from '../../../shared/dto/vod/SeriesDto';
import { IFactory } from '../../../shared/interfaces/IFactory';
import { IPublisher } from '../../../shared/interfaces/IPublisher';
import { IStorageAdaptor } from '../../../shared/interfaces/IStorageAdaptor';
import { PublisherEvent } from '../../../shared/PublisherAdaptor';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import { ISeriesRepository } from '../shared/ISeriesRepository';
import Series from '../shared/Series';
import { SeriesError } from '../shared/SeriesError';

import { IAddSeriesDomain } from './IAddSeriesDomain';

export default class AddSeriesDomain implements IAddSeriesDomain {
  private readonly repository: ISeriesRepository;

  private readonly seriesFactory: IFactory<Series, SeriesRequestDto, SeriesDto>;

  constructor(
    repository: ISeriesRepository,
    seriesFactory: IFactory<Series, SeriesRequestDto, SeriesDto>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly publisherAdaptor: IPublisher<PublisherEvent>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.seriesFactory = seriesFactory;
  }

  async addNewSeries(seriesDto: SeriesRequestDto): Promise<Series> {
    const series = await this.seriesFactory.toDomain(seriesDto);

    if (await this.repository.exists(series)) {
      throw new SeriesError.SeriesAlreadyExist();
    }
    try {
      const pathThumbnail = await this.fileStorage.store(`series/${series.id}`, series.thumbnail.value(), 'thumbnail');
      series.updateThumbnail(pathThumbnail);
    } catch (e) {
      throw new SeriesError.UnableToSaveThumbnail();
    }
    try {
      if (series.alternateThumbnail) {
        const pathAlternateThumbnail = await this.fileStorage.store(`series/${series.id}`, series.alternateThumbnail.value(), 'alternate-thumbnail');
        series.updateAlternateThumbnail(pathAlternateThumbnail);
      }
    } catch (e) {
      throw new SeriesError.UnableToSaveThumbnail();
    }
    try {
      if (series.backgroundThumbnail) {
        const pathBackgroundThumbnail = await this.fileStorage.store(`series/${series.id}`, series.backgroundThumbnail.value(), 'background-thumbnail');
        series.updateBackgroundThumbnail(pathBackgroundThumbnail);
      }
    } catch (e) {
      throw new SeriesError.UnableToSaveThumbnail();
    }
    if (series.shouldDeactivate()) series.updateEnabled(false);
    await this.repository.save(series);

    if (series.packages) {
      await this.publisherAdaptor.publish({
        eventType: 'SERIES_ADDED',
        payload: series.id,
      });
    }

    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.SERIES,
      entityId: series.id,
    });

    return series;
  }
}
