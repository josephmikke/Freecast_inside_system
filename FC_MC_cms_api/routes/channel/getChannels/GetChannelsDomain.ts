import { ChannelQueryParameters } from '../../shared/dto/ChannelDto';
import { ChannelPage, IChannelRepository } from '../shared/IChannelRepository';

import { IGetChannelsDomain } from './IGetChannelsDomain';

export default class GetChannelsDomain implements IGetChannelsDomain {
  private readonly repository: IChannelRepository;

  constructor(
    repository: IChannelRepository,
  ) {
    this.repository = repository;
  }

  async getChannels(channelsParams: ChannelQueryParameters): Promise<ChannelPage> {
    return this.repository.findAll({
      filter: {
        active: channelsParams.active !== undefined ? channelsParams.active === 'true' : undefined,
        categories: channelsParams.categories?.split(','),
        packages: channelsParams.packages?.split(','),
        platforms: channelsParams.platforms?.split(','),
        providers: channelsParams.providers?.split(','),
        programs: {
          filter: { startTime: channelsParams.startTime, endTime: channelsParams.endTime },
          ignore: false,
        },
      },
      search: channelsParams.search,
      sort: {
        attr: channelsParams.sortType,
        order: channelsParams.sortOrder,
      },
      limit: channelsParams.limit ? parseInt(channelsParams.limit, 10) : undefined,
      exclude: channelsParams.exclude,
      nextToken: channelsParams.nextToken,
    });
  }
}
