import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetChannelsEvent } from '../../shared/dto/ChannelDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { ChannelError } from '../shared/ChannelError';

import { IGetChannelsDomain } from './IGetChannelsDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetChannelsEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetChannelsDomain;

  constructor(domain: IGetChannelsDomain) {
    this.domain = domain;
  }

  async handler(event: GetChannelsEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { channels, nextToken } = await this.domain.getChannels(event.queryStringParameters);
      return {
        statusCode: 200,
        body: JSON.stringify({ channels, nextToken }),
      };
    } catch (e) {
      switch (true) {
        case e instanceof ChannelError.UnknownChannelDependency:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: `Unknown channel dependency ${e}`,
            }),
          };
        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
