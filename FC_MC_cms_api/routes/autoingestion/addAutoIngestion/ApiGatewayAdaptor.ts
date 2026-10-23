import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddAutoIngestionEvent } from '../../shared/dto/AutoIngestionDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { CronTaskError } from '../../shared/valueObjects/CronTask';
import { AutoIngestionError } from '../shared/AutoIngestionError';

import { IAddAutoIngestionDomain } from './IAddAutoIngestionDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddAutoIngestionEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IAddAutoIngestionDomain) {}

  async handler(event: AddAutoIngestionEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const autoIngestion = await this.domain.addNewAutoIngestion(event.body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/autoingestions/${autoIngestion.id}`,
        },
      };
    } catch (e) {
      switch (true) {
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
              error: 'Unable to create schedule',
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
