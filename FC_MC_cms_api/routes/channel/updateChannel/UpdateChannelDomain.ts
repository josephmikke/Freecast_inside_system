import { ChannelDto, ChannelRequestDto, UpdateChannelBody } from '../../shared/dto/ChannelDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { StreamProps } from '../../shared/dto/StreamDto';
import ICDNAdaptor from '../../shared/interfaces/ICDNAdaptor';
import { IFactory } from '../../shared/interfaces/IFactory';
import { IPublisher } from '../../shared/interfaces/IPublisher';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { PublisherEvent } from '../../shared/PublisherAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import Thumbnail from '../../shared/valueObjects/Thumbnail';
import { StreamError } from '../../stream/shared/StreamError';
import Channel from '../shared/Channel';
import { ChannelError } from '../shared/ChannelError';
import ChannelFactory from '../shared/ChannelFactory';
import { IChannelRepository } from '../shared/IChannelRepository';

import { IUpdateChannelDomain } from './IUpdateChannelDomain';

export default class UpdateChannelDomain implements IUpdateChannelDomain {
  private readonly repository: IChannelRepository;

  private readonly channelFactory: IFactory<Channel, ChannelRequestDto, ChannelDto>;

  constructor(
    repository: IChannelRepository,
    channelFactory: IFactory<Channel, ChannelRequestDto, ChannelDto>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly cdnAdaptor: ICDNAdaptor,
    private readonly publisherAdaptor: IPublisher<PublisherEvent>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.channelFactory = channelFactory;
  }

  private static isSlugDifferent(original: Channel, updated: Partial<ChannelRequestDto>) {
    return updated.slug && original.slug !== updated.slug;
  }

  private async updateNewProps(channel: Channel, newProps: Partial<ChannelRequestDto>) {
    // We replace base64 payload by image path is an update is required
    let path = channel.thumbnail.value();
    const modifiedThumbnails = [];

    if (newProps.thumbnail) {
      const thumbnail = new Thumbnail(newProps.thumbnail);
      path = await this.fileStorage.store(
        `channels/${channel.id}`,
        thumbnail.value(),
        'thumbnail',
      );
      await modifiedThumbnails.push(`/${path}`);
    }
    try {
      await this.cdnAdaptor.invalidateCache(modifiedThumbnails);
    } catch (e) {
      console.error(e);
    }
    return {
      ...newProps,
      thumbnail: path,
      updatedAt: new Date().toISOString(),
    };
  }

  static streamHasId(streamProp: Partial<StreamProps>): boolean {
    return 'id' in streamProp;
  }

  static isValidStreamProps(streamProp: Partial<StreamProps>): boolean {
    return 'name' in streamProp && 'type' in streamProp && 'format' in streamProp && 'data' in streamProp && 'daiParams' in streamProp;
  }

  private async updateNewStreams(channel: Channel, newProps: UpdateChannelBody) {
    const { streams } = channel;

    if (streams === undefined) throw new ChannelError.UnableToUpdateChannel();

    if (newProps.streams) {
      const existingStreams = streams.filter(
        (stream) => newProps.streams?.includes(stream.id),
      ) ?? [];
      const newStreams = (newProps.streams.filter(
        (stream) => typeof stream !== 'string',
      ) as Array<Partial<StreamProps>>).map(
        (stream) => {
          if (UpdateChannelDomain.streamHasId(stream)) {
            const existingStream = streams.find((streamItem) => streamItem.id === stream.id);

            if (existingStream) {
              return {
                ...existingStream,
                ...stream,
                updatedAt: new Date().toISOString(),
              };
            }
            throw new StreamError.UnknownStreamDependency(`${stream.id} not found.`);
          } else if (UpdateChannelDomain.isValidStreamProps(stream)) {
            return stream;
          }
          throw new StreamError.MalformedStreamDependency();
        },
      ) as Array<StreamProps>;
      return [...existingStreams, ...newStreams];
    }
    return streams;
  }

  async updateChannel(id: string, newProps: Partial<ChannelRequestDto>): Promise<void> {
    const channel = await this.repository.findOne(id);
    if (!channel) {
      throw new ChannelError.ChannelNotFound();
    }
    const props = await this.updateNewProps(channel, newProps);
    if (UpdateChannelDomain.isSlugDifferent(channel, props)) {
      const updatedChannel = Object.assign({}, channel, props);
      if (await this.repository.exists(updatedChannel)) {
        throw new ChannelError.ChannelAlreadyExist();
      }
    }
    const updatedChannelDto = Object.assign(
      {},
      this.channelFactory.toPersistence(channel),
      props,
    );
    const updatedStreams = await this.updateNewStreams(channel, props);
    try {
      await this.repository.remove(channel);
      const updatedChannel = await (this.channelFactory as ChannelFactory).toDomain({
        ...updatedChannelDto,
        streams: updatedStreams,
      }, undefined, true);
      const isUpdated = await this.repository.save(updatedChannel);
      if (newProps.mediapackageId || newProps.mediapackageId === '') {
        await this.publisherAdaptor.publish({ eventType: 'MEDIAPACKAGE_ID_UPDATED', payload: newProps.mediapackageId });
      }
      if (newProps.packages) {
        await this.publisherAdaptor.publish({ eventType: 'PACKAGES_UPDATED', payload: newProps.packages });
      }
      await this.logTracker.track({
        event: LogEvent.UPDATE,
        entity: LogEntity.CHANNEL,
        entityId: channel.id,
      });
      if (!isUpdated) throw new ChannelError.UnableToUpdateChannel();
    } catch (e) {
      await (this.channelFactory as ChannelFactory).removeStreams();
      const originalChannel = await this.channelFactory.toDomain({
        ...this.channelFactory.toPersistence(channel),
        categories: channel.categories ?? [],
        streams: channel.streams ?? [],
      });
      await this.repository.save(originalChannel);
      throw e;
    }
  }
}
