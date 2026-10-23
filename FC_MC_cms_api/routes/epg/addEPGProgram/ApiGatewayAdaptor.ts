import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddEPGProgramEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { StorageError } from '../../shared/StorageError';
import { ThumbnailError } from '../../shared/valueObjects/Thumbnail';
import { EPGError } from '../shared/EPGError';

import { IAddEPGProgramDomain } from './IAddEPGProgramDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddEPGProgramEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IAddEPGProgramDomain) {
  }

  async handler(event: AddEPGProgramEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body, pathParameters } = event;
      const program = await this.domain.addNewEPGProgram(pathParameters.id, body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/program/${program.id}`,
        },
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
