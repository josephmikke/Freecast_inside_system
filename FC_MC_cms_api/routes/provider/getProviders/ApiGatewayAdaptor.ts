import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetProvidersEvent } from '../../shared/dto/ProviderDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetProvidersDomain } from './IGetProvidersDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetProvidersEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetProvidersDomain;

  constructor(domain: IGetProvidersDomain) {
    this.domain = domain;
  }

  async handler(_event: GetProvidersEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const providers = await this.domain.getProviders();
      return {
        statusCode: 200,
        body: JSON.stringify({
          providers,
        }),
      };
    } catch (e) {
      switch (true) {
        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
