import { Context, EventBridgeEvent } from 'aws-lambda';

import { IngestedVodEvent, MediaJobStatus } from '../../shared/dto/vod/IngestDto';

export default interface IGetIngestionDomain {
  setVodStream(
    ingestedVodEvent: EventBridgeEvent<string, IngestedVodEvent>,
    context?: Context,
  ): Promise<void>;
  updateJobStatus(
    ingestionId: string,
    entityId: string,
    status: MediaJobStatus,
    error?: string,
  ): Promise<void>;
  updateIngestionStatus(ingestionId: string): Promise<void>;
}
