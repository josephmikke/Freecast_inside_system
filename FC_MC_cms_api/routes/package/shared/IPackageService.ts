import Package from './Package';

export interface IPackageService {
  dependenciesExist(item: Package): Promise<boolean>
  remove(item: Package): Promise<boolean>
  exists(item: Package): Promise<boolean>
  save(item: Package): Promise<boolean>
  findAll(): Promise<Package[]>
  findOne(id: string): Promise<Package | undefined>
}
