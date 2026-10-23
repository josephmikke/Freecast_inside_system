import Ingestion from '../shared/Ingestion';

export interface IGetIngestionDomain {
  getIngestion(id: string): Promise<Ingestion>
}
