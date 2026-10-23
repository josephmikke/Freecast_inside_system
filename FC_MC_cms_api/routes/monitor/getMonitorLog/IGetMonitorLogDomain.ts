import { MonitorLogDTO } from '../../shared/dto/MonitorLogDto';

export interface IGetMonitorLogDomain {
  execute(flow: string): Promise<MonitorLogDTO[]>;
}