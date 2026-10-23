import { EPGQueryParameters } from '../../shared/dto/EPGDto';
import Channel from '../shared/Channel';
import { ChannelError } from '../shared/ChannelError';
import { IChannelRepository } from '../shared/IChannelRepository';

import { IGetChannelDomain } from './IGetChannelDomain';

export default class GetChannelDomain implements IGetChannelDomain {
  private readonly repository: IChannelRepository;

  constructor(
    repository: IChannelRepository,
  ) {
    this.repository = repository;
  }

  async getChannel(id: string, programsFilters: EPGQueryParameters): Promise<Channel> {
    const channel = await this.repository.findOne(id, {
      filter: {
        startTime: programsFilters.startTime,
        endTime: programsFilters.endTime,
      },
      ignore: false,
    });
    if (!channel) throw new ChannelError.ChannelNotFound();
    return channel;
  }
}
