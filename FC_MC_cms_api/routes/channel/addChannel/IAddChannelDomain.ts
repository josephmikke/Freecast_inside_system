import { ChannelRequestDto } from '../../shared/dto/ChannelDto';
import Channel from '../shared/Channel';

export interface IAddChannelDomain {
  addNewChannel(channel: ChannelRequestDto): Promise<Channel>
}
