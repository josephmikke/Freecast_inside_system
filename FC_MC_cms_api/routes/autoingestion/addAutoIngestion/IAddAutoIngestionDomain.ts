import { AutoIngestionRequestDto } from '../../shared/dto/AutoIngestionDto';
import AutoIngestion from '../shared/AutoIngestion';

export interface IAddAutoIngestionDomain {
  addNewAutoIngestion(autoIngestionDto: AutoIngestionRequestDto): Promise<AutoIngestion>
}
