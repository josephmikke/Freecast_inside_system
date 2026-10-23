import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { CategoryError } from '../../category/shared/CategoryError';
import { DeleteEPGEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { SchedulerError } from '../../shared/scheduler/SchedulerError';
import { StorageError } from '../../shared/StorageError';
import { EPGError } from '../shared/EPGError';

import { IDeleteEPGDomain } from './IDeleteEPGDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteEPGEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IDeleteEPGDomain) {
  }

  async handler(event: DeleteEPGEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.deleteEPG(event.pathParameters.id);
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
        case e instanceof EPGError.EPGCannotBeDeleted:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: 'EPG Cannot Be Deleted',
            }),
          };
        case e instanceof EPGError.EPGHasDependencies:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Cannot delete an EPG with dependencies',
            }),
          };
        case e instanceof StorageError.UnableToDeleteFile:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `EPG Cannot Be Deleted: Unable to delete thumbnail file: ${e}`,
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
