import { ChannelQueryParameters } from '../../shared/dto/ChannelDto';
import { ChannelPage } from '../shared/IChannelRepository';

export interface IGetChannelsDomain {
  getChannels(channelsParams: ChannelQueryParameters): Promise<ChannelPage>
}
