import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetMonitorLogsEvent } from '../../shared/dto/MonitorLogDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { MonitorLogError } from '../shared/MonitorLogError';
import { IGetMonitorLogsDomain } from './IGetMonitorLogsDomain';

export default class ApiGatewayAdaptor implements
  IInvoker<GetMonitorLogsEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetMonitorLogsDomain;

  constructor(domain: IGetMonitorLogsDomain) {
    this.domain = domain;
  }

  async handler(
    event: GetMonitorLogsEvent,
    context?: Context,
  ): Promise<APIGatewayProxyResult> {
    try {
      const { channel } = event.pathParameters;
      const { startDate, endDate, level } = event.queryStringParameters || {};

      const logs = await this.domain.execute(channel, startDate, endDate, level);

      return {
        statusCode: 200,
        body: JSON.stringify(logs),
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