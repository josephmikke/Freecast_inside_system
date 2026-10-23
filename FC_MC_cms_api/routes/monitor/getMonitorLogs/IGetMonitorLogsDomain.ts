import { MonitorLogDTO } from '../../shared/dto/MonitorLogDto';

export interface IGetMonitorLogsDomain {
  execute(channel: string, startDate?: string, endDate?: string, level?: string): Promise<MonitorLogDTO[]>;
}