import { PackageRequestDto } from '../../shared/dto/PackageDto';

export interface IUpdatePackageDomain {
  updatePackage(id: string, props: Partial<PackageRequestDto>): Promise<boolean>
}
