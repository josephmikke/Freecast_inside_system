import AutoIngestion from '../shared/AutoIngestion';

export interface IGetAutoIngestionsDomain {
  getAutoIngestions(): Promise<AutoIngestion[]>
}
