import { IPlatformRepository } from '../shared/IPlatformRepository';
import Platform from '../shared/Platform';

import { IGetPlatformsDomain } from './IGetPlatformsDomain';

export default class GetPlatformsDomain implements IGetPlatformsDomain {
  private readonly repository: IPlatformRepository;

  constructor(repository: IPlatformRepository) {
    this.repository = repository;
  }

  async getPlatforms(): Promise<Platform[]> {
    return this.repository.findAll();
  }
}
