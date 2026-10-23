import { IngestVodState, MrssIngestionStatus } from '../../shared/dto/vod/IngestDto';
import { StateMachineAdaptor } from '../../vod/shared/stateMachineAdaptor/StateMachineAdaptor';
import IngestionFactory from '../../vod/ingestion/shared/IngestionFactory';
import IngestionRepository from '../../vod/ingestion/shared/IngestionRepository';
import { DEFAULT_MRSS_MAPPING } from '../shared/DefaultMrssMapping';
import { AutoIngestionError } from '../shared/AutoIngestionError';
import { IAutoIngestionRepository } from '../shared/IAutoIngestionRepository';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

export default class RunAutoIngestionDomain {
  constructor(
    private readonly autoIngestionRepository: IAutoIngestionRepository,
    private readonly ingestionRepository: IngestionRepository,
    private readonly ingestionFactory: IngestionFactory,
    private readonly stateMachineAdaptor: StateMachineAdaptor,
    private readonly uid: UID,
  ) {}

  async run(autoIngestionId: string): Promise<void> {
    const autoIngestion = await this.autoIngestionRepository.findOne(autoIngestionId);
    if (!autoIngestion) {
      throw new AutoIngestionError.AutoIngestionNotFound();
    }
    if (!autoIngestion.enabled) {
      return;
    }

    const runId = this.uid.generate(8);
    const ingestion = await this.ingestionFactory.toDomain({
      extId: `${autoIngestion.mrss_feed}#${runId}`,
      parentId: autoIngestion.id,
      status: MrssIngestionStatus.SCHEDULED,
    });

    await this.ingestionRepository.save(ingestion);
    await this.autoIngestionRepository.appendIngestionId(autoIngestion, ingestion.id);

    await this.stateMachineAdaptor.startExecution(
      `autoingestion-${autoIngestion.id}-${Date.now()}`,
      {
        type: IngestVodState.MAP_URL,
        url: autoIngestion.mrss_feed,
        mapping: DEFAULT_MRSS_MAPPING,
        isPrivate: false,
        provider: autoIngestion.providerID,
        packages: autoIngestion.package_ids,
        brands: [],
        distributors: [],
        locations: [],
        platforms: autoIngestion.platform_ids,
        ingestionParentId: autoIngestion.id,
      },
    );
  }
}
