import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateProviderEvent } from '../../shared/dto/ProviderDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { ProviderError } from '../shared/ProviderError';

import { IUpdateProviderDomain } from './IUpdateProviderDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateProviderEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateProviderDomain;

  constructor(domain: IUpdateProviderDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateProviderEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { pathParameters, body } = event;
    try {
      await this.domain.updateProvider(pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/providers/${pathParameters.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof ProviderError.ProviderNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Provider Not Found',
            }),
          };
        case e instanceof ProviderError.ProviderAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Provider Already Exist',
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
