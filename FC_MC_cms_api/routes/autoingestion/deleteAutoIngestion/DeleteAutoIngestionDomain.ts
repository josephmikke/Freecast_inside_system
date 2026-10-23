import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { SchedulerError } from '../../shared/scheduler/SchedulerError';
import { AutoIngestionError } from '../shared/AutoIngestionError';
import AutoIngestionScheduler from '../shared/AutoIngestionScheduler';
import { IAutoIngestionRepository } from '../shared/IAutoIngestionRepository';

import { IDeleteAutoIngestionDomain } from './IDeleteAutoIngestionDomain';

export default class DeleteAutoIngestionDomain implements IDeleteAutoIngestionDomain {
  constructor(
    private readonly autoIngestionRepository: IAutoIngestionRepository,
    private readonly autoIngestionScheduler: AutoIngestionScheduler,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

  async deleteAutoIngestion(id: string): Promise<boolean> {
    const autoIngestion = await this.autoIngestionRepository.findOne(id);
    if (!autoIngestion) {
      throw new AutoIngestionError.AutoIngestionNotFound();
    }

    try {
      await this.autoIngestionScheduler.remove(autoIngestion);
    } catch (e) {
      if (e instanceof SchedulerError.UnableToDeleteSchedule) {
        throw new AutoIngestionError.UnableToDeleteSchedule();
      }
      throw e;
    }

    const isDeleted = await this.autoIngestionRepository.remove(autoIngestion);
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.AUTOINGESTION,
      entityId: autoIngestion.id,
    });
    return isDeleted;
  }
}
