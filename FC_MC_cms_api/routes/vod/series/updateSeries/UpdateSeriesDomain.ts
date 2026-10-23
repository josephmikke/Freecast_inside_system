import { LogEntity, LogEvent } from '../../../shared/dto/LogDto';
import { SeriesDto, SeriesRequestDto } from '../../../shared/dto/vod/SeriesDto';
import ICDNAdaptor from '../../../shared/interfaces/ICDNAdaptor';
import { IFactory } from '../../../shared/interfaces/IFactory';
import { IPublisher } from '../../../shared/interfaces/IPublisher';
import { IStorageAdaptor } from '../../../shared/interfaces/IStorageAdaptor';
import { PublisherEvent } from '../../../shared/PublisherAdaptor';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Thumbnail from '../../../shared/valueObjects/Thumbnail';
import { ISeriesRepository } from '../shared/ISeriesRepository';
import Series from '../shared/Series';
import { SeriesError } from '../shared/SeriesError';

import { IUpdateSeriesDomain } from './IUpdateSeriesDomain';

export default class UpdateSeriesDomain implements IUpdateSeriesDomain {
  private readonly repository: ISeriesRepository;

  private readonly seriesFactory: IFactory<Series, SeriesRequestDto, SeriesDto>;

  constructor(
    repository: ISeriesRepository,
    seriesFactory: IFactory<Series, SeriesRequestDto, SeriesDto>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly cdnAdaptor: ICDNAdaptor,
    private readonly publisherAdaptor: IPublisher<PublisherEvent>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.seriesFactory = seriesFactory;
  }

  private static isExternalSlugDifferent(original: Series, updated: Partial<SeriesRequestDto>) {
    return updated.slug && original.slug !== updated.slug;
  }

  private async updateNewProps(series: Series, newProps: Partial<SeriesRequestDto>) {
    // We replace base64 payload by image path is an update is required
    let pathThumbnail = series.thumbnail.value();
    let pathAlternateThumbnail = series.alternateThumbnail?.value();
    let pathBackgroundThumbnail = series.backgroundThumbnail?.value();
    const modifiedThumbnails = [];

    if (newProps.thumbnail) {
      const thumbnail = new Thumbnail(newProps.thumbnail);
      pathThumbnail = await this.fileStorage.store(
        `series/${series.id}`,
        thumbnail.value(),
        'thumbnail',
      );
      await modifiedThumbnails.push(`/${pathThumbnail}`);
    }
    if (newProps.alternateThumbnail) {
      const thumbnail = new Thumbnail(newProps.alternateThumbnail);
      pathAlternateThumbnail = await this.fileStorage.store(
        `series/${series.id}`,
        thumbnail.value(),
        'alternate-thumbnail',
      );
      await modifiedThumbnails.push(`/${pathAlternateThumbnail}`);
    }
    if (newProps.backgroundThumbnail) {
      const thumbnail = new Thumbnail(newProps.backgroundThumbnail);
      pathBackgroundThumbnail = await this.fileStorage.store(
        `series/${series.id}`,
        thumbnail.value(),
        'background-thumbnail',
      );
      await modifiedThumbnails.push(`/${pathBackgroundThumbnail}`);
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
      backgroundThumbnail: pathBackgroundThumbnail,
      updatedAt: new Date().toISOString(),
      isIngest: false,
    };
  }

  async updateSeries(id: string, newProps: Partial<SeriesRequestDto>): Promise<void> {
    const series = await this.repository.findOne(id);
    if (!series) {
      throw new SeriesError.SeriesNotFound();
    }
    const props = await this.updateNewProps(series, newProps);
    if (UpdateSeriesDomain.isExternalSlugDifferent(series, props)) {
      const updatedSeries = Object.assign({}, series, props);
      if (await this.repository.exists(updatedSeries)) {
        throw new SeriesError.SeriesAlreadyExist();
      }
    }
    const updatedSeriesDto = Object.assign(
      {},
      this.seriesFactory.toPersistence(series),
      props,
    );
    try {
      await this.repository.remove(series);
      const updatedSeries = await this.seriesFactory.toDomain({
        ...updatedSeriesDto,
        // toPersistence keeps only category ids; pass the loaded categories to keep their weights
        categories: props.categories ?? series.categories ?? [],
      });
      if (updatedSeries.shouldDeactivate()) updatedSeries.updateEnabled(false);
      const isUpdated = await this.repository.save(updatedSeries);
      if (!isUpdated) throw new SeriesError.UnableToUpdateSeries();
      if (series.packages || newProps.episodes?.length !== series.episodes?.length) {
        await this.publisherAdaptor.publish({
          eventType: 'SERIES_UPDATED',
          payload: series.id,
        });
      }
      await this.logTracker.track({
        event: LogEvent.UPDATE,
        entity: LogEntity.SERIES,
        entityId: updatedSeries.id,
      });
    } catch (e) {
      const originalSeries = await this.seriesFactory
        .toDomain({
          ...this.seriesFactory.toPersistence(series),
          categories: series.categories ?? [],
        });
      if (originalSeries.shouldDeactivate()) originalSeries.updateEnabled(false);
      await this.repository.save(originalSeries);
      throw e;
    }
  }
}
