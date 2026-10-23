import { ChannelDto, ChannelRequestDto } from '../../shared/dto/ChannelDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { IPublisher } from '../../shared/interfaces/IPublisher';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { PublisherEvent } from '../../shared/PublisherAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import Channel from '../shared/Channel';
import { ChannelError } from '../shared/ChannelError';
import ChannelFactory from '../shared/ChannelFactory';
import { IChannelRepository } from '../shared/IChannelRepository';

import { IAddChannelDomain } from './IAddChannelDomain';

export default class AddChannelDomain implements IAddChannelDomain {
  private readonly repository: IChannelRepository;

  private readonly channelFactory: IFactory<Channel, ChannelRequestDto, ChannelDto>;

  constructor(
    repository: IChannelRepository,
    channelFactory: IFactory<Channel, ChannelRequestDto, ChannelDto>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly publisherAdaptor: IPublisher<PublisherEvent>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.channelFactory = channelFactory;
  }

  async addNewChannel(channelDto: ChannelRequestDto): Promise<Channel> {
    try {
      const channel = await (this.channelFactory as ChannelFactory)
        .toDomain(channelDto, undefined, true);

      if (await this.repository.exists(channel)) {
        (this.channelFactory as ChannelFactory).removeStreams();
        throw new ChannelError.ChannelAlreadyExist();
      }
      try {
        const path = await this.fileStorage.store(`channels/${channel.id}`, channel.thumbnail.value(), 'thumbnail');
        channel.updateThumbnail(path);
      } catch (e) {
        (this.channelFactory as ChannelFactory).removeStreams();
        throw new ChannelError.UnableToSaveThumbnail();
      }
      await this.repository.save(channel);
      if (channel.mediapackageId.value() !== '') {
        await this.publisherAdaptor.publish({
          eventType: 'CHANNEL_ADDED',
          payload: channel.mediapackageId.value(),
        });
      }
      await this.logTracker.track({
        event: LogEvent.INSERT,
        entity: LogEntity.CHANNEL,
        entityId: channel.id,
      });
      return channel;
    } catch (e) {
      (this.channelFactory as ChannelFactory).removeStreams();
      throw e;
    }
  }
}
