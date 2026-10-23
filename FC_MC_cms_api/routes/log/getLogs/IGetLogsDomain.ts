import { LogQueryParameters } from '../../shared/dto/LogDto';
import { LogPage } from '../shared/ILogRepository';

export interface IGetLogsDomain {
  getLogs(logsParams: LogQueryParameters): Promise<LogPage>
}
