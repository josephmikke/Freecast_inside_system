import {
  MrssMappingTemplate,
} from '../../shared/dto/MrssDto';
import { IngestVodState } from '../../shared/dto/vod/IngestDto';
import { IStateMachineAdaptor } from '../shared/stateMachineAdaptor/IStateMachineAdaptor';

import { IIngestVodDomain } from './IIngestVodDomain';

export default class IngestVodDomain implements IIngestVodDomain {
  constructor(private readonly stateMachineAdaptor: IStateMachineAdaptor) { }

  async ingestVod(
    mrssUrl: string,
    mappingTemplate: MrssMappingTemplate,
    isPrivate: boolean,
    provider: string,
    packages: Array<string>,
    brands: Array<string>,
    distributors: Array<string>,
    locations: Array<string>,
    platforms: Array<string>,
  )
    : Promise<boolean> {
    return this.stateMachineAdaptor.startExecution(`vod-ingestion-${Date.now()}`, {
      type: IngestVodState.MAP_URL,
      url: mrssUrl,
      mapping: mappingTemplate,
      isPrivate,
      provider,
      packages,
      brands,
      distributors,
      locations,
      platforms,
    });
  }
}
