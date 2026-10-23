import { EPGQueryParameters } from '../../shared/dto/EPGDto';
import Channel from '../shared/Channel';

export interface IGetChannelDomain {
  getChannel(id: string, programsFilters: EPGQueryParameters): Promise<Channel>
}
