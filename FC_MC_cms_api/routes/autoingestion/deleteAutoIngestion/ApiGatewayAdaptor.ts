import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteAutoIngestionEvent } from '../../shared/dto/AutoIngestionDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { AutoIngestionError } from '../shared/AutoIngestionError';

import { IDeleteAutoIngestionDomain } from './IDeleteAutoIngestionDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteAutoIngestionEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IDeleteAutoIngestionDomain) {}

  async handler(event: DeleteAutoIngestionEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.deleteAutoIngestion(event.pathParameters.id);
      return {
        statusCode: 204,
        body: '',
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
        case e instanceof AutoIngestionError.UnableToDeleteSchedule:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to delete schedule',
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
