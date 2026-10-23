import { MediaPackageVodClient, CreateAssetCommand } from '@aws-sdk/client-mediapackage-vod';

import { IIngester } from '../IIngester';

import { MediaPackageError } from './MediaPackageIngesterError';

export default class MediaPackageIngester implements IIngester {
  constructor(
    private readonly client: MediaPackageVodClient,
    private readonly packagingGroupId: string,
    private readonly sourceRoleArn: string,
    private readonly sourceArn: string,
  ) {}

  async ingest(id: string, resourceId: string, source: string): Promise<boolean> {
    try {
      return !!await this.client.send(new CreateAssetCommand({
        Id: id,
        PackagingGroupId: this.packagingGroupId,
        ResourceId: resourceId,
        SourceArn: `${this.sourceArn}/${source}`,
        SourceRoleArn: this.sourceRoleArn,
        Tags: {
          test: 'data-test',
        },
      }));
    } catch (err) {
      const message = (err as Error)?.message ?? '';
      if (/already exists/i.test(message)) {
        console.warn(
          `[MediaPackageIngester] Asset id="${id}" already exists in MediaPackage. Treating as success (idempotent).`,
        );
        return true;
      }
      throw new MediaPackageError.UnableToIngestAsset(err);
    }
  }
}
