import { IIngestionRepository } from '../shared/IIngestionRepository';
import Ingestion from '../shared/Ingestion';
import { IngestionError } from '../shared/IngestionError';

import { IGetIngestionDomain } from './IGetIngestionDomain';

export default class GetIngestionDomain implements IGetIngestionDomain {
  private readonly repository: IIngestionRepository;

  constructor(
    repository: IIngestionRepository,
  ) {
    this.repository = repository;
  }

  async getIngestion(id: string): Promise<Ingestion> {
    const ingestion = await this.repository.findOne(id);
    if (!ingestion) throw new IngestionError.IngestionNotFound();
    return ingestion;
  }
}
