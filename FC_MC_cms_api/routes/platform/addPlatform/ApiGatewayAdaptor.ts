import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddPlatformEvent } from '../../shared/dto/PlatformDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { PlatformError } from '../shared/PlatformError';

import { IAddPlatformDomain } from './IAddPlatformDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddPlatformEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddPlatformDomain;

  constructor(domain: IAddPlatformDomain) {
    this.domain = domain;
  }

  async handler(event: AddPlatformEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      const platform = await this.domain.addNewPlatform(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/platforms/${platform.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof PlatformError.PlatformAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Platform already exist',
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
