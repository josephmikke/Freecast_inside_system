import { MonitorLogDTO } from '../../shared/dto/MonitorLogDto';
import MonitorLogRepository from '../shared/MonitorLogRepository';
import { IGetMonitorLogsDomain } from './IGetMonitorLogsDomain';

export default class GetMonitorLogsDomain implements IGetMonitorLogsDomain {
  private readonly repository: MonitorLogRepository;

  constructor(repository: MonitorLogRepository) {
    this.repository = repository;
  }

  async execute(): Promise<MonitorLogDTO[]> {
    return this.repository.findAll();
  }
}