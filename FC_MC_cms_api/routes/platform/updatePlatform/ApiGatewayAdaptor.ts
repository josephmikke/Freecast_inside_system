import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdatePlatformEvent } from '../../shared/dto/PlatformDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { PlatformError } from '../shared/PlatformError';

import { IUpdatePlatformDomain } from './IUpdatePlatformDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdatePlatformEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdatePlatformDomain;

  constructor(domain: IUpdatePlatformDomain) {
    this.domain = domain;
  }

  async handler(event: UpdatePlatformEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { pathParameters, body } = event;
    try {
      await this.domain.updatePlatform(pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/platforms/${pathParameters.id}`,
        },
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
        case e instanceof PlatformError.PlatformAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Platform Already Exist',
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
