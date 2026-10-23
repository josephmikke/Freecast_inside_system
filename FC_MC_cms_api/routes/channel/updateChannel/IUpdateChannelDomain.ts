import { UpdateChannelBody } from '../../shared/dto/ChannelDto';

export interface IUpdateChannelDomain {
  updateChannel(id: string, channel: UpdateChannelBody): Promise<void>
}
