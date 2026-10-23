import AutoIngestion from '../shared/AutoIngestion';

export interface IGetAutoIngestionDomain {
  getAutoIngestion(id: string): Promise<AutoIngestion>
}
