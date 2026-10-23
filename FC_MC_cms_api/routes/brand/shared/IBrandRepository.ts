import Brand from './Brand';

export interface IBrandRepository {
  findAll(): Promise<Brand[]>
  findMany(ids: number[] | string[]): Promise<Brand[]>
  findOne(id: number): Promise<Brand | undefined>
}
