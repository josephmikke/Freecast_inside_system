import { Context, EventBridgeEvent } from 'aws-lambda';

import { AssetCreationVodEvent, MediaJobStatus } from '../../shared/dto/vod/IngestDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import IAssetCreationVodDomain from './IAssetCreatedDomain';

export default class AssetCreationVodAdaptor implements IInvoker<EventBridgeEvent<string,
AssetCreationVodEvent>, Context, void> {
  constructor(
    private readonly domain: IAssetCreationVodDomain,
  ) {}

  static relationEvent: { [key: string]: MediaJobStatus } = {
    IngestStart: MediaJobStatus.MEDIAPACKAGE_PROGRESSING,
    IngestError: MediaJobStatus.MEDIAPACKAGE_ERROR,
    IngestComplete: MediaJobStatus.MEDIAPACKAGE_COMPLETE,
    VodAssetPlayable: MediaJobStatus.MEDIAPACKAGE_PLAYABLE,
  };

  public async handler(event: EventBridgeEvent<string,
  any>, _context: Context) {
    try {
      console.log(event);
      const {
        ingestionId,
        type,
        entityId,
      } = await this.domain.parseEvent(event);

      if (ingestionId === '' || type === '' || entityId === '') {
        console.log('Not supported event', event);
        return;
      }

      await this.domain.updateJobStatus(
        ingestionId,
        `${type}/${entityId}`,
        AssetCreationVodAdaptor.relationEvent[event.detail.event] as MediaJobStatus,
        AssetCreationVodAdaptor
          .relationEvent[event.detail.event] as MediaJobStatus === MediaJobStatus.MEDIAPACKAGE_ERROR
          ? `MediaPackage Asset Creation: ${event.detail.message}`
          : undefined,
      );
      if (
        AssetCreationVodAdaptor
          .relationEvent[event.detail.event] as MediaJobStatus
          === MediaJobStatus.MEDIAPACKAGE_PLAYABLE
        && event.detail.packaging_configuration_id
        && event.detail.manifest_urls
      ) {
        await this.domain.setEntityStream(
          entityId,
          type,
          event.detail.packaging_configuration_id,
          event.detail.manifest_urls,
        );
      }
      await this.domain.updateIngestionStatus(ingestionId);
    } catch (e) {
      console.log(e);
    }
  }
}
