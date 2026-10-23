import { CloudFrontClient, CreateInvalidationCommand } from '@aws-sdk/client-cloudfront';

import { CDNAdaptorError } from './CDNAdaptorError';
import ICDNAdaptor from './interfaces/ICDNAdaptor';

export default class CDNAdaptor implements ICDNAdaptor {
  constructor(
    private readonly cloudfrontClient: CloudFrontClient,
    private readonly distributionId: string,
  ) {}

  async invalidateCache(paths: string[]): Promise<void> {
    try {
      if (!paths.length) return;
      await this.cloudfrontClient.send(new CreateInvalidationCommand({
        DistributionId: this.distributionId,
        InvalidationBatch: {
          Paths: {
            Quantity: paths.length,
            Items: paths,
          },
          CallerReference: `${Date.now()}`,
        },
      }));
    } catch (e) {
      throw new CDNAdaptorError.UnableInvalidateCache(e);
    }
  }
}
