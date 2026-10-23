import {
  LambdaClient,
  InvokeCommand,
  InvocationType,
} from '@aws-sdk/client-lambda';

import { EventInvokerError } from './EventInvokerError';
import { IEventInvoker } from './IEventInvoker';

export default class LambdaAdaptor implements IEventInvoker<string, Object, boolean> {
  constructor(
    private readonly lambdaClient: LambdaClient,
  ) {}

  async invoke(event: string, eventInput: Object): Promise<boolean> {
    try {
      const invokeCommand = new InvokeCommand({
        FunctionName: event,
        InvocationType: InvocationType.RequestResponse,
        Payload: Buffer.from(JSON.stringify(eventInput)),
      });

      const { Payload } = await this.lambdaClient.send(invokeCommand);
      const response = JSON.parse(new TextDecoder('utf-8').decode(Payload));
      if (response.statusCode > 204) {
        throw new EventInvokerError.UnableToInvokeEvent(response.body);
      }
      return true;
    } catch (e) {
      throw new EventInvokerError.UnableToInvokeEvent(e);
    }
  }
}
