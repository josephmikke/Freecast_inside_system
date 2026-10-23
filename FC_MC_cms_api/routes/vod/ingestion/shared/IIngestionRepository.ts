import {
  IngestionDto, IngestionParameters, IngestionRequestDto, MrssIngestionStatus,
} from '../../../shared/dto/vod/IngestDto';
import { IFactory } from '../../../shared/interfaces/IFactory';

import Ingestion from './Ingestion';

export interface IngestionPage {
  ingestions: Array<Ingestion>,
  nextToken?: string,
}

export interface IIngestionRepository {
  findOne(id: string): Promise<Ingestion | undefined>;
  findByExtId(extId: string): Promise<Ingestion | undefined>;
  findAll(params?: IngestionParameters): Promise<IngestionPage>;
  remove(recording: Ingestion): Promise<boolean>
  exists(recording: Ingestion): Promise<boolean>
  save(recording: Ingestion): Promise<boolean>
  findAllByStatus(status: MrssIngestionStatus): Promise<Ingestion[]>
  updateStatus(
    recording: Ingestion, statusKey: string, statusValue: MrssIngestionStatus
  ): Promise<boolean>
  updateUniqueField<T>(
    recording: Ingestion, fieldKey: string, fieldValue: T
  ): Promise<boolean>
  updateJobField(
    ingestion: Ingestion, jobKey: string, jobStatus: string
  ): Promise<boolean>
  getFactory(): IFactory<Ingestion,
  IngestionRequestDto, IngestionDto>
}
