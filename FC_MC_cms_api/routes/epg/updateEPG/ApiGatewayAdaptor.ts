import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateEPGEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { SchedulerError } from '../../shared/scheduler/SchedulerError';
import { StorageError } from '../../shared/StorageError';
import { CronTaskError } from '../../shared/valueObjects/CronTask';
import { EPGError } from '../shared/EPGError';

import { IUpdateEPGDomain } from './IUpdateEPGDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateEPGEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IUpdateEPGDomain) {
  }

  async handler(event: UpdateEPGEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body, pathParameters } = event;
      await this.domain.updateEPG(pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        case e instanceof EPGError.EPGNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'EPG Not Found',
            }),
          };
        case e instanceof EPGError.EPGAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'EPG extId already exists',
            }),
          };
        case e instanceof EPGError.UnknownEPGDependency:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Invalid dependencies',
            }),
          };
        case e instanceof EPGError.UnableToFetchEPG:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to fetch EPG: ${e}`,
            }),
          };
        case e instanceof SchedulerError.UnableToCreateSchedule:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Ingestion scheduler: Unable to create schedule: ${e}`,
            }),
          };
        case e instanceof EPGError.UnableToParseEPG:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to parse EPG: ${e}`,
            }),
          };
        case e instanceof CronTaskError.InvalidCronTaskExpression:
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: `Invalid Cron expression: ${e}`,
            }),
          };
        case e instanceof StorageError.UnableToStoreFile:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: `Unable to store thumbnail: ${e}`,
            }),
          };
        case e instanceof SchedulerError.UnableToDeleteSchedule:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `EPG Cannot Be Deleted: Unable to detach schedule rule: ${e}`,
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
