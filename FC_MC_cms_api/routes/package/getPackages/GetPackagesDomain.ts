import { IPackageRepository } from '../shared/IPackageRepository';
import Package from '../shared/Package';

import { IGetPackagesDomain } from './IGetPackagesDomain';

export default class GetPackagesDomain implements IGetPackagesDomain {
  private readonly packageRepository: IPackageRepository;

  constructor(
    packageRepository: IPackageRepository,
  ) {
    this.packageRepository = packageRepository;
  }

  async getPackages(): Promise<Package[]> {
    return this.packageRepository.findAll();
  }
}
