import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteAllEPGProgramEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IDeleteAllEPGProgramsDomain } from './IDeleteAllEPGProgramsDomain';
import {EPGError} from "../shared/EPGError";
import {StorageError} from "../../shared/StorageError";
import {SchedulerError} from "../../shared/scheduler/SchedulerError";

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteAllEPGProgramEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IDeleteAllEPGProgramsDomain) {
  }

  async handler(event: DeleteAllEPGProgramEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.deleteAllEPGProgram(event.pathParameters.id);
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
        case e instanceof StorageError.UnableToDeleteFile:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `EPG Cannot Be Deleted: Unable to delete thumbnail file: ${e}`,
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