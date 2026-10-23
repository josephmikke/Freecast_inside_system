import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

import { IPublisher } from './interfaces/IPublisher';

export interface PublisherEvent {
  eventType: string;
  payload: Object
}

export class PublisherAdaptor implements IPublisher<PublisherEvent> {
  constructor(private readonly client: EventBridgeClient) {

  }

  async publish(event: PublisherEvent): Promise<boolean> {
    const command = await new PutEventsCommand({
      Entries: [{ // PutEventsRequestEntry
        Time: new Date(),
        Source: 'cms.api',
        DetailType: event.eventType,
        Detail: JSON.stringify({
          payload: event.payload,
          env: process.env.ENV!,
        }),
        EventBusName: process.env.BUSNAME!,
      }],
    });
    return !!await this.client.send(command);
  }
}
