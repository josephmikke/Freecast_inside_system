import { AutoIngestionError } from '../shared/AutoIngestionError';
import { IAutoIngestionRepository } from '../shared/IAutoIngestionRepository';
import AutoIngestion from '../shared/AutoIngestion';

import { IGetAutoIngestionDomain } from './IGetAutoIngestionDomain';

export default class GetAutoIngestionDomain implements IGetAutoIngestionDomain {
  constructor(private readonly autoIngestionRepository: IAutoIngestionRepository) {}

  async getAutoIngestion(id: string): Promise<AutoIngestion> {
    const autoIngestion = await this.autoIngestionRepository.findOne(id);
    if (!autoIngestion) {
      throw new AutoIngestionError.AutoIngestionNotFound();
    }
    return autoIngestion;
  }
}
