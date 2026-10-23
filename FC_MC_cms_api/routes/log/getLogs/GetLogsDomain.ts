import { LogQueryParameters } from '../../shared/dto/LogDto';
import { ILogRepository, LogPage } from '../shared/ILogRepository';

import { IGetLogsDomain } from './IGetLogsDomain';

export default class GetLogsDomain implements IGetLogsDomain {
  private readonly repository: ILogRepository;

  constructor(repository: ILogRepository) {
    this.repository = repository;
  }

  async getLogs(logsParams: LogQueryParameters): Promise<LogPage> {
    return this.repository.findAll({
      limit: logsParams.limit ? parseInt(logsParams.limit, 10) : undefined,
      nextToken: logsParams.nextToken,
    });
  }
}
