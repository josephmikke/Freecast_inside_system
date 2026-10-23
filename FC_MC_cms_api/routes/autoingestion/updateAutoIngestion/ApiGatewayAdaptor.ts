import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateAutoIngestionEvent } from '../../shared/dto/AutoIngestionDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { CronTaskError } from '../../shared/valueObjects/CronTask';
import { AutoIngestionError } from '../shared/AutoIngestionError';

import { IUpdateAutoIngestionDomain } from './IUpdateAutoIngestionDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateAutoIngestionEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IUpdateAutoIngestionDomain) {}

  async handler(event: UpdateAutoIngestionEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.updateAutoIngestion(event.pathParameters.id, event.body);
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
        case e instanceof AutoIngestionError.AutoIngestionAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'AutoIngestion already exist',
            }),
          };
        case e instanceof AutoIngestionError.UnknownAutoIngestionDependency:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Invalid dependencies',
            }),
          };
        case e instanceof AutoIngestionError.UnableToCreateSchedule:
        case e instanceof CronTaskError.InvalidCronTaskExpression:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to update schedule',
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
