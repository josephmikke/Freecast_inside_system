import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddEPGEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { SchedulerError } from '../../shared/scheduler/SchedulerError';
import { StorageError } from '../../shared/StorageError';
import { ThumbnailError } from '../../shared/valueObjects/Thumbnail';
import { CronTaskError } from '../../shared/valueObjects/CronTask';
import { EPGError } from '../shared/EPGError';

import { IAddEPGDomain } from './IAddEPGDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddEPGEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IAddEPGDomain) {
  }

  async handler(event: AddEPGEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      const epg = await this.domain.addNewEPG(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/epg/${epg.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof EPGError.EPGAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'EPG already exist',
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
              error: `Unable to create schedule: ${e}`,
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
        case e instanceof ThumbnailError.InvalidThumbnail:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: `Unable to store thumbnail: ${e}`,
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
