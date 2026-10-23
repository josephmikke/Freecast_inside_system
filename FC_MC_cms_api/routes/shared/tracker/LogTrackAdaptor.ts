import { InvocationType, InvokeCommand } from '@aws-sdk/client-lambda';

import { ILogTracker } from './ILogTracker';

export interface TrackDto {
  event: string;
  entity: string;
  entityId?: string;
  user?: string;
}

export class LogTrackAdaptor implements ILogTracker<TrackDto> {
  constructor(
    private readonly logTrackArn: string,
    private readonly lambdaClient: any,
    private readonly Logger: any,
  ) {
  }

  async track(payload: TrackDto): Promise<void> {
    try {
      const invokeCommand = new InvokeCommand({
        FunctionName: this.logTrackArn,
        InvocationType: InvocationType.RequestResponse,
        Payload: JSON.stringify(payload),
      });
      const { Payload } = await this.lambdaClient.send(invokeCommand);
      const response = JSON.parse(new TextDecoder('utf-8').decode(Payload));
      if (response.statusCode > 204) {
        throw new Error(response.body);
      }
    } catch (err) {
      this.Logger.error('can\'t log track');
      throw new Error(err);
    }
  }
}
