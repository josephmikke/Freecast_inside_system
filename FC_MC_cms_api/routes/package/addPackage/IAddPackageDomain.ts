import { PackageRequestDto } from '../../shared/dto/PackageDto';
import Package from '../shared/Package';

export interface IAddPackageDomain {
  addNewPackage(packageItem: PackageRequestDto): Promise<Package>
}
