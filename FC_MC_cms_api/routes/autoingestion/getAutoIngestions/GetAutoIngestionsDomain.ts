import { IAutoIngestionRepository } from '../shared/IAutoIngestionRepository';
import AutoIngestion from '../shared/AutoIngestion';

import { IGetAutoIngestionsDomain } from './IGetAutoIngestionsDomain';

export default class GetAutoIngestionsDomain implements IGetAutoIngestionsDomain {
  constructor(private readonly autoIngestionRepository: IAutoIngestionRepository) {}

  async getAutoIngestions(): Promise<AutoIngestion[]> {
    return this.autoIngestionRepository.findAll();
  }
}
