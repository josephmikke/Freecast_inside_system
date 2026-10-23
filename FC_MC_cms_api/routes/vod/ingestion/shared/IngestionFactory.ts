import {
  IngestionDto, IngestionRequestDto, MrssIngestionStatus,
} from '../../../shared/dto/vod/IngestDto';
import { IFactory } from '../../../shared/interfaces/IFactory';

import Ingestion from './Ingestion';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

export default class IngestionFactory implements IFactory<Ingestion,
IngestionRequestDto, IngestionDto> {
  private readonly uid: UID;

  constructor(uid: UID) {
    this.uid = uid;
  }

  async toDomain(raw: IngestionRequestDto): Promise<Ingestion> {
    return Ingestion.create({
      ...raw,
      status: raw.status || MrssIngestionStatus.SCHEDULED,
      jobs: raw.jobs ?? {},
      createdAt: raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      enabled: raw.enabled ?? true,
      failures: raw.failures ?? [],
      saved: raw.saved ?? [],
    }, raw.id || this.uid.generate(8));
  }

  toPersistence(ingestion: Ingestion): Required<IngestionDto> {
    return {
      id: ingestion.id,
      parentId: ingestion.parentId,
      createdAt: ingestion.createdAt,
      updatedAt: ingestion.updatedAt,
      extId: ingestion.extId,
      status: ingestion.status,
      jobs: ingestion.jobs,
      failures: ingestion.failures ?? [],
      saved: ingestion.saved ?? [],
      enabled: ingestion.enabled,
    };
  }
}
