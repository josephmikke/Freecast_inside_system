import Package from './Package';

export interface IPackageRepository {
  findAll(): Promise<Package[]>
  findMany(ids: Array<string>): Promise<Array<Package>>
  findOne(id: string): Promise<Package | undefined>
  hasRelationships(item: Package): Promise<boolean>
  remove(item: Package): Promise<boolean>
  save(item: Package): Promise<boolean>
  exists(item: Package): Promise<boolean>
  updateWeight(packages: Array<Package>): Promise<boolean>
}
