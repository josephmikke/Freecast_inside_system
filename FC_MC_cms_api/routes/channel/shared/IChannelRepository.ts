import { ChannelsParameters } from '../../shared/dto/ChannelDto';
import { EPGProgramsParameters } from '../../shared/dto/EPGDto';

import Channel from './Channel';

export interface ChannelPage {
  channels: Channel[],
  nextToken?: string;
}

export interface IChannelRepository {
  findAll(channelsParams?: ChannelsParameters): Promise<ChannelPage>
  findMany(ids: Array<string>): Promise<Array<Channel>>
  findOne(id: string, programsFilters?: EPGProgramsParameters): Promise<Channel | undefined>
  hasRelationships(item: Channel): Promise<boolean>
  remove(item: Channel): Promise<boolean>
  save(channel: Channel): Promise<boolean>
  exists(channel: Channel): Promise<boolean>
}
