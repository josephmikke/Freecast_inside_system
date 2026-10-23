import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IPublisher } from '../../shared/interfaces/IPublisher';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { PublisherEvent } from '../../shared/PublisherAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { ChannelError } from '../shared/ChannelError';
import { IChannelRepository } from '../shared/IChannelRepository';

import { IDeleteChannelDomain } from './IDeleteChannelDomain';

export default class DeleteChannelDomain implements IDeleteChannelDomain {
  constructor(
    private readonly repository: IChannelRepository,
    private readonly fileStorage: IStorageAdaptor,
    private readonly publisherAdaptor: IPublisher<PublisherEvent>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

  async deleteChannel(id: string): Promise<void> {
    const channel = await this.repository.findOne(id);
    if (!channel) throw new ChannelError.ChannelNotFound();
    await this.fileStorage.remove(channel.thumbnail.value());
    const deleted = await this.repository.remove(channel);
    if (!deleted) throw new ChannelError.UnableToRemoveChannel();
    if (channel.mediapackageId.value() !== '') {
      await this.publisherAdaptor.publish({
        eventType: 'CHANNEL_REMOVED',
        payload: channel.mediapackageId.value(),
      });
    }
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.CHANNEL,
      entityId: channel.id,
    });
  }
}
