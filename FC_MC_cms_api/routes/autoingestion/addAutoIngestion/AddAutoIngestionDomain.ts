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

import { IAddAutoIngestionDomain } from './IAddAutoIngestionDomain';

export default class AddAutoIngestionDomain implements IAddAutoIngestionDomain {
  constructor(
    private readonly autoIngestionRepository: IAutoIngestionRepository,
    private readonly autoIngestionFactory: AutoIngestionFactory,
    private readonly autoIngestionScheduler: AutoIngestionScheduler,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

  async addNewAutoIngestion(autoIngestionDto: AutoIngestionRequestDto): Promise<AutoIngestion> {
    const autoIngestion = await this.autoIngestionFactory.toDomain(autoIngestionDto);
    if (await this.autoIngestionRepository.exists(autoIngestion)) {
      throw new AutoIngestionError.AutoIngestionAlreadyExist();
    }

    let schedulerId = '';
    try {
      if (autoIngestion.enabled) {
        schedulerId = await this.autoIngestionScheduler.schedule(autoIngestion);
      }
    } catch (e) {
      if (e instanceof SchedulerError.UnableToCreateSchedule) {
        throw new AutoIngestionError.UnableToCreateSchedule();
      }
      throw e;
    }

    const autoIngestionToSave = AutoIngestion.create({
      ...this.autoIngestionFactory.toPersistence(autoIngestion),
      scheduler_id: schedulerId,
      ingestion_ids: [],
    }, autoIngestion.id);

    await this.autoIngestionRepository.save(autoIngestionToSave);
    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.AUTOINGESTION,
      entityId: autoIngestionToSave.id,
    });
    return autoIngestionToSave;
  }
}
