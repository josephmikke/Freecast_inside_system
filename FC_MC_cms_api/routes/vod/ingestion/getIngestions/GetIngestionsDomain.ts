import { IngestionQueryParameters } from '../../../shared/dto/vod/IngestDto';
import { IngestionPage, IIngestionRepository } from '../shared/IIngestionRepository';

import { IGetIngestionsDomain } from './IGetIngestionsDomain';

export default class GetIngestionsDomain implements IGetIngestionsDomain {
  private readonly repository: IIngestionRepository;

  constructor(
    repository: IIngestionRepository,
  ) {
    this.repository = repository;
  }

  async getIngestions(ingestionParams: IngestionQueryParameters): Promise<IngestionPage> {
    return this.repository.findAll({
      filter: {
        status: ingestionParams.status,
        parentId: ingestionParams.parentId,
        enabled: ingestionParams.enabled !== undefined ? ingestionParams.enabled === 'true' : undefined,
      },
      search: ingestionParams.search,
      sort: {
        attr: ingestionParams.sortType,
        order: ingestionParams.sortOrder,
      },
      limit: ingestionParams.limit ? parseInt(ingestionParams.limit, 10) : undefined,
      nextToken: ingestionParams.nextToken,
    });
  }
}
