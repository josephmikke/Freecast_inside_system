import { MonitorLogDTO } from '../../shared/dto/MonitorLogDto';
import { MonitorLogError } from '../shared/MonitorLogError';
import MonitorLogRepository from '../shared/MonitorLogRepository';
import { IGetMonitorLogDomain } from './IGetMonitorLogDomain';

export default class GetMonitorLogDomain implements IGetMonitorLogDomain {
  private readonly repository: MonitorLogRepository;

  constructor(repository: MonitorLogRepository) {
    this.repository = repository;
  }

  async execute(flow: string): Promise<MonitorLogDTO[]> {
    const logs = await this.repository.findOne(flow);
    if (!logs.length) {
      throw new MonitorLogError('MonitorLog not found');
    }
    return logs;
  }
}

