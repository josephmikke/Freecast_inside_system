import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteProviderEvent } from '../../shared/dto/ProviderDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { ProviderError } from '../shared/ProviderError';

import { IDeleteProviderDomain } from './IDeleteProviderDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteProviderEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IDeleteProviderDomain;

  constructor(domain: IDeleteProviderDomain) {
    this.domain = domain;
  }

  async handler(event: DeleteProviderEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { pathParameters } = event;
      await this.domain.deleteProvider(pathParameters.id);
      return {
        statusCode: 204,
        body: '',
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
        case e instanceof ProviderError.ProviderHasDependencies:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Cannot delete a Provider with dependencies',
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
