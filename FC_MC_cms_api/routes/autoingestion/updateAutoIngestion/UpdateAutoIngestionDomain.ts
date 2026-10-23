import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { AutoIngestionRequestDto } from '../../shared/dto/AutoIngestionDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { SchedulerError } from '../../shared/scheduler/SchedulerError';
import AutoIngestion from '../shared/AutoIngestion';
import AutoIngestionFactory from '../shared/AutoIngestionFactory';
import { AutoIngestionError } from '../shared/AutoIngestionError';
import AutoIngestionScheduler from '../shared/AutoIngestionScheduler';
import { IAutoIngestionRepository } from '../shared/IAutoIngestionRepository';

import { IUpdateAutoIngestionDomain } from './IUpdateAutoIngestionDomain';

export default class UpdateAutoIngestionDomain implements IUpdateAutoIngestionDomain {
  constructor(
    private readonly autoIngestionRepository: IAutoIngestionRepository,
    private readonly autoIngestionFactory: AutoIngestionFactory,
    private readonly autoIngestionScheduler: AutoIngestionScheduler,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

  private async resolveSchedulerId(
    original: AutoIngestion,
    updated: AutoIngestion,
    scheduleChanged: boolean,
    enabledChanged: boolean,
  ) {
    if (!updated.enabled) {
      if (original.scheduler_id) {
        await this.autoIngestionScheduler.remove(original);
      }
      return '';
    }

    if (!original.scheduler_id || scheduleChanged || enabledChanged) {
      try {
        return await this.autoIngestionScheduler.reschedule(updated);
      } catch (e) {
        if (e instanceof SchedulerError.UnableToCreateSchedule
          || e instanceof SchedulerError.UnableToDeleteSchedule) {
          throw new AutoIngestionError.UnableToCreateSchedule();
        }
        throw e;
      }
    }

    return updated.scheduler_id;
  }

  async updateAutoIngestion(
    id: string,
    newProps: Partial<AutoIngestionRequestDto> & { enabled?: boolean },
  ): Promise<boolean> {
    const originalAutoIngestion = await this.autoIngestionRepository.findOne(id);
    if (!originalAutoIngestion) {
      throw new AutoIngestionError.AutoIngestionNotFound();
    }

    const updatedAutoIngestion = await this.autoIngestionFactory.toDomain({
      ...this.autoIngestionFactory.toPersistence(originalAutoIngestion),
      ...newProps,
      id,
      updatedAt: new Date().toISOString(),
    });

    if (
      originalAutoIngestion.mrss_feed !== updatedAutoIngestion.mrss_feed
      && await this.autoIngestionRepository.exists(updatedAutoIngestion)
    ) {
      throw new AutoIngestionError.AutoIngestionAlreadyExist();
    }

    const scheduleChanged = originalAutoIngestion.schedule !== updatedAutoIngestion.schedule
      || originalAutoIngestion.timezone !== updatedAutoIngestion.timezone;
    const enabledChanged = originalAutoIngestion.enabled !== updatedAutoIngestion.enabled;

    const schedulerId = await this.resolveSchedulerId(
      originalAutoIngestion,
      updatedAutoIngestion,
      scheduleChanged,
      enabledChanged,
    );

    const autoIngestionToSave = AutoIngestion.create({
      ...this.autoIngestionFactory.toPersistence(updatedAutoIngestion),
      scheduler_id: schedulerId,
      ingestion_ids: originalAutoIngestion.ingestion_ids,
    }, id);

    await this.autoIngestionRepository.remove(originalAutoIngestion);
    const isUpdated = await this.autoIngestionRepository.save(autoIngestionToSave);
    await this.logTracker.track({
      event: LogEvent.UPDATE,
      entity: LogEntity.AUTOINGESTION,
      entityId: autoIngestionToSave.id,
    });
    return isUpdated;
  }
}
