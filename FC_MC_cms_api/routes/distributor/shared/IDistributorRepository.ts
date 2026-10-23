import Distributor from './Distributor';

export interface IDistributorRepository {
  findAll(): Promise<Distributor[]>
  findMany(ids: number[] | string[]): Promise<Distributor[]>
  findOne(id: number): Promise<Distributor | undefined>
}
