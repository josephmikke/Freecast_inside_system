import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteChannelEvent } from '../../shared/dto/ChannelDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { ChannelError } from '../shared/ChannelError';

import { IDeleteChannelDomain } from './IDeleteChannelDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteChannelEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IDeleteChannelDomain;

  constructor(domain: IDeleteChannelDomain) {
    this.domain = domain;
  }

  async handler(event: DeleteChannelEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.deleteChannel(event.pathParameters.id);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        case e instanceof ChannelError.ChannelNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Channel Not Found',
            }),
          };

        case e instanceof ChannelError.UnableToRemoveChannel:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to remove channel: ${e}`,
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
