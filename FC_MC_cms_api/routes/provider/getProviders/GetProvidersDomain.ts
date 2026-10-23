import { IProviderRepository } from '../shared/IProviderRepository';
import Provider from '../shared/Provider';

import { IGetProvidersDomain } from './IGetProvidersDomain';

export default class GetProvidersDomain implements IGetProvidersDomain {
  private readonly repository: IProviderRepository;

  constructor(repository: IProviderRepository) {
    this.repository = repository;
  }

  async getProviders(): Promise<Provider[]> {
    return this.repository.findAll();
  }
}
