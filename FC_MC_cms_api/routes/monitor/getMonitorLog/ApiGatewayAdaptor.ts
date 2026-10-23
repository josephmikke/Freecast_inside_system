import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetMonitorLogEvent } from '../../shared/dto/MonitorLogDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { MonitorLogError } from '../shared/MonitorLogError';
import { IGetMonitorLogDomain } from './IGetMonitorLogDomain';

export default class ApiGatewayAdaptor implements
  IInvoker<GetMonitorLogEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetMonitorLogDomain;

  constructor(domain: IGetMonitorLogDomain) {
    this.domain = domain;
  }

  async handler(
    event: GetMonitorLogEvent,
    context?: Context,
  ): Promise<APIGatewayProxyResult> {
    try {
      const { channel } = event.pathParameters;
      const log = await this.domain.execute(channel);

      return {
        statusCode: 200,
        body: JSON.stringify(log),
      };
    } catch (error) {
      if (error instanceof MonitorLogError) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: error.message }),
        };
      }

      throw error;
    }
  }
}
