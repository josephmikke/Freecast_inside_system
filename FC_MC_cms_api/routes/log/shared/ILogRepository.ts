import { LogParameters } from '../../shared/dto/LogDto';

import Log from './Log';

export interface LogPage {
  logs: Array<Log>,
  nextToken?: string;
}

export interface ILogRepository {
  save(log: Log): Promise<boolean>
  findAll(logsParams?: LogParameters): Promise<LogPage>
}
