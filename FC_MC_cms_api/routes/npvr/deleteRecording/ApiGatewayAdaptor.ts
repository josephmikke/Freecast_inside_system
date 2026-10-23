import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { SystemDeleteRecordingsEvent } from '../../shared/dto/RecordingDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { StorageError } from '../../shared/StorageError';
import { RecordingError } from '../shared/RecordingError';

import { ISystemDeleteRecordingsDomain } from './ISystemDeleteRecordingsDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<SystemDeleteRecordingsEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: ISystemDeleteRecordingsDomain) {
  }

  async handler(
    event: SystemDeleteRecordingsEvent,
    _context?: Context,
  ): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.deleteRecordings(event.pathParameters.id);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        case e instanceof RecordingError.RecordingNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Recording Not Found',
            }),
          };
        case e instanceof StorageError.UnableToDeleteFile:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: 'Unable to delete assets',
            }),
          };
        default:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: e,
            }),
          };
      }
    }
  }
}
