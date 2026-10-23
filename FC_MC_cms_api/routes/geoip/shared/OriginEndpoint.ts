// eslint-disable-next-line max-classes-per-file
import {
  DescribeOriginEndpointCommand,
  DescribeOriginEndpointCommandOutput,
  MediaPackageClient,
} from '@aws-sdk/client-mediapackage';

import MediaPackageId from '../../shared/valueObjects/MediaPackageId';

import { IOriginEndpoint } from './IOriginEndpoint';

export namespace OriginEndpointError {
  export class UnableToDescribeOriginEndpoints extends Error {
  }
}

export default class OriginEndpoint implements IOriginEndpoint<MediaPackageId> {
  constructor(private readonly client: MediaPackageClient) {
  }

  private static buildMediaPackageEndpointId(mediaPackageId: MediaPackageId) {
    return [
      `DASH_${mediaPackageId.value()}`,
      `DASH_${mediaPackageId.value()}_Encrypted`,
      `HLS_${mediaPackageId.value()}`,
      `HLS_${mediaPackageId.value()}_Encrypted`,
    ];
  }

  private async describeEndpoints(commands: DescribeOriginEndpointCommand[]) {
    return Promise.all(commands
      .map(async (command) => this.client.send(command)));
  }

  private static buildCommands(mpEndpointIds: string[]) {
    return mpEndpointIds.map((id) => new DescribeOriginEndpointCommand({
      Id: id,
    }));
  }

  private getEndpointUrl(endpoint: DescribeOriginEndpointCommandOutput) {
    return endpoint.Url!;
  }

  async describeOriginEndpoints(mediaPackageId: MediaPackageId): Promise<string[]> {
    try {
      const commands = OriginEndpoint.buildCommands(
        OriginEndpoint.buildMediaPackageEndpointId(mediaPackageId),
      );
      const endpoints = await this.describeEndpoints(commands);
      return endpoints.map(this.getEndpointUrl);
    } catch (e) {
      throw new OriginEndpointError.UnableToDescribeOriginEndpoints(e);
    }
  }
}
