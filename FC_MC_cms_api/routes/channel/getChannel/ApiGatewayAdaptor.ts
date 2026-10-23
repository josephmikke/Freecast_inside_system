import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetChannelEvent } from '../../shared/dto/ChannelDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { ChannelError } from '../shared/ChannelError';

import { IGetChannelDomain } from './IGetChannelDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetChannelEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetChannelDomain;

  constructor(domain: IGetChannelDomain) {
    this.domain = domain;
  }

  async handler(event: GetChannelEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const channel = await this.domain.getChannel(
        event.pathParameters.id,
        event.queryStringParameters,
      );
      return {
        statusCode: 200,
        body: JSON.stringify(channel),
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
