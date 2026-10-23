import { Context, EventBridgeEvent } from 'aws-lambda';

import { IngestedVodEvent, MediaJobStatus } from '../../shared/dto/vod/IngestDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import IIngestedVodDomain from './IIngestedVodDomain';

export default class IngestedVodAdaptor implements IInvoker<EventBridgeEvent<string,
IngestedVodEvent>, Context, void> {
  constructor(
    private readonly domain: IIngestedVodDomain,
  ) {}

  public async handler(event: EventBridgeEvent<string,
  IngestedVodEvent>, context: Context) {
    try {
      console.log(event);
      await this.domain.updateJobStatus(
        event.detail.userMetadata.ingestionId ?? '',
        event.detail.userMetadata.entityId ?? '',
        `MEDIACONVERT_${event.detail.status}` as MediaJobStatus,
        event.detail.status === 'ERROR'
          ? `${event.detail.errorCode}: ${event.detail.errorMessage}`
          : undefined,
      );
      if (event.detail.status === 'COMPLETE') {
        await this.domain.setVodStream(event, context);
      }
      await this.domain.updateIngestionStatus(event.detail.userMetadata.ingestionId ?? '');
    } catch (e) {
      console.log(e);
    }
  }
}
