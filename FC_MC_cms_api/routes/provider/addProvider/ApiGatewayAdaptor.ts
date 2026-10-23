import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddProviderEvent } from '../../shared/dto/ProviderDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { ProviderError } from '../shared/ProviderError';

import { IAddProviderDomain } from './IAddProviderDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddProviderEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddProviderDomain;

  constructor(domain: IAddProviderDomain) {
    this.domain = domain;
  }

  async handler(event: AddProviderEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      const provider = await this.domain.addNewProvider(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/providers/${provider.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof ProviderError.ProviderAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Provider already exist',
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
