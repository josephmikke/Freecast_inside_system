import Location from './Location';

export interface ILocationService {
  dependenciesExist(item: Location): Promise<boolean>
  remove(item: Location): Promise<boolean>
  exists(item: Location): Promise<boolean>
  save(item: Location): Promise<boolean>
  findAll(): Promise<Location[]>
  findOne(id: string): Promise<Location | undefined>
}
