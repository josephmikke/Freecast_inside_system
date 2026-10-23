import { LogDto, LogRequestDto, TrackLogEvent } from '../../shared/dto/LogDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { ILogRepository } from '../shared/ILogRepository';
import Log from '../shared/Log';

export default class TrackLogDomain {
  private readonly logRepository: ILogRepository;

  private readonly logFactory: IFactory<Log, LogRequestDto, LogDto>;

  constructor(
    logRepository: ILogRepository,
    logFactory: IFactory<Log, LogRequestDto, LogDto>,
  ) {
    this.logRepository = logRepository;
    this.logFactory = logFactory;
  }

  async track(event: TrackLogEvent): Promise<Log> {
    const log = await this.logFactory.toDomain(event);
    await this.logRepository.save(log);
    return log;
  }
}
