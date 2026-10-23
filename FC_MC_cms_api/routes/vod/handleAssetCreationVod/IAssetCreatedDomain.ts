import { EventBridgeEvent } from 'aws-lambda';

import { AssetCreationVodEvent, AssetCreationVodEventParsed, MediaJobStatus } from '../../shared/dto/vod/IngestDto';

export default interface IGetIngestionDomain {
  updateJobStatus(
    ingestionId: string,
    entityId: string,
    status: MediaJobStatus,
    error?: string,
  ): Promise<void>;
  parseEvent(event: EventBridgeEvent<string, AssetCreationVodEvent>): AssetCreationVodEventParsed;
  updateIngestionStatus(ingestionId: string): Promise<void>;
  setEntityStream(
    entityId: string,
    type: string,
    packageConf: string,
    manifestUrls: Array<string>,
  ): Promise<void>;
}
