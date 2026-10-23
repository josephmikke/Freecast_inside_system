import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetAutoIngestionEvent } from '../../shared/dto/AutoIngestionDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { AutoIngestionError } from '../shared/AutoIngestionError';

import { IGetAutoIngestionDomain } from './IGetAutoIngestionDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetAutoIngestionEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IGetAutoIngestionDomain) {}

  async handler(event: GetAutoIngestionEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const autoIngestion = await this.domain.getAutoIngestion(event.pathParameters.id);
      return {
        statusCode: 200,
        body: JSON.stringify({ autoIngestion }),
      };
    } catch (e) {
      switch (true) {
        case e instanceof AutoIngestionError.AutoIngestionNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'AutoIngestion Not Found',
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
