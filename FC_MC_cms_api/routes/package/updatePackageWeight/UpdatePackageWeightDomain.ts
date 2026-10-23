import { PackageDto, PackageRequestDto } from '../../shared/dto/PackageDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { IPackageRepository } from '../shared/IPackageRepository';
import Package from '../shared/Package';
import { PackageError } from '../shared/PackageError';

import { IUpdatePackageWeightDomain } from './IUpdatePackageWeightDomain';

export default class UpdatePackageWeightDomain implements IUpdatePackageWeightDomain {
  constructor(
    private readonly packageRepository: IPackageRepository,
    private readonly packageFactory: IFactory<Package, PackageRequestDto, PackageDto>,
  ) {}

  private static NOT_FOUND = 0;

  private changePosition(packages: Array<Package>, initialIndex: number, newIndex: number) {
    const [element] = packages.splice(initialIndex, 1);
    packages.splice(newIndex, 0, element);
    return packages.map((packageItem, key) => {
      packageItem.updateWeight(key);
      return packageItem;
    });
  }

  async updatePackageWeight(id: string, index: string): Promise<boolean> {
    const packages = await this.packageRepository.findAll();
    const initialIndex = packages.findIndex((packageItem) => packageItem.id === id);
    if (initialIndex < UpdatePackageWeightDomain.NOT_FOUND) {
      throw new PackageError.PackageNotFound();
    }
    const newArr = this.changePosition(packages, initialIndex, parseInt(index, 10));
    return this.packageRepository.updateWeight(newArr);
  }
}
