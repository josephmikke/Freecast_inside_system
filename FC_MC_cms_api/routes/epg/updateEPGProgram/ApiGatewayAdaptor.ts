import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateEPGProgramEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { StorageError } from '../../shared/StorageError';
import { EPGError } from '../shared/EPGError';

import { IUpdateEPGProgramDomain } from './IUpdateEPGProgramDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateEPGProgramEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IUpdateEPGProgramDomain) {
  }

  async handler(event: UpdateEPGProgramEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body, pathParameters } = event;
      await this.domain.updateEPGProgram(pathParameters.id, pathParameters.programId, body);
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
            statusCode: 404,
            body: JSON.stringify({
              error: 'Program Not Found',
            }),
          };
        case e instanceof EPGError.UnableToUpdateProgram:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to update program',
            }),
          };
        case e instanceof EPGError.UnableToFetchEPG:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to fetch EPG: ${e}`,
            }),
          };
        case e instanceof StorageError.UnableToStoreFile:
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
