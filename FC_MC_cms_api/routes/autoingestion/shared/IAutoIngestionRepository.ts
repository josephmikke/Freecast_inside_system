import AutoIngestion from './AutoIngestion';

export interface IAutoIngestionRepository {
  findAll(): Promise<AutoIngestion[]>
  findOne(id: string): Promise<AutoIngestion | undefined>
  remove(item: AutoIngestion): Promise<boolean>
  save(item: AutoIngestion): Promise<boolean>
  exists(item: AutoIngestion): Promise<boolean>
  appendIngestionId(item: AutoIngestion, ingestionId: string): Promise<boolean>
}
