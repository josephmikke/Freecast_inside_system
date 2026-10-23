import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetLogsEvent } from '../../shared/dto/LogDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetLogsDomain } from './IGetLogsDomain';

export default class ApiGatewayAdaptor implements
  IInvoker<GetLogsEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetLogsDomain;

  constructor(domain: IGetLogsDomain) {
    this.domain = domain;
  }

  async handler(event: GetLogsEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { logs, nextToken } = await this.domain.getLogs(event.queryStringParameters);
      return {
        statusCode: 200,
        body: JSON.stringify({ logs, nextToken }),
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: '',
      };
    }
  }
}
