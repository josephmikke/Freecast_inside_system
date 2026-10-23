import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeletePlatformEvent } from '../../shared/dto/PlatformDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { PlatformError } from '../shared/PlatformError';

import { IDeletePlatformDomain } from './IDeletePlatformDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeletePlatformEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IDeletePlatformDomain;

  constructor(domain: IDeletePlatformDomain) {
    this.domain = domain;
  }

  async handler(event: DeletePlatformEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { pathParameters } = event;
      await this.domain.deletePlatform(pathParameters.id);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        case e instanceof PlatformError.PlatformNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Platform Not Found',
            }),
          };
        case e instanceof PlatformError.PlatformHasDependencies:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Cannot delete a Platform with dependencies',
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
