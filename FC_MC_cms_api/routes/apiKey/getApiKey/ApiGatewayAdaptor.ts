import { Event } from '@middy/http-json-body-parser';
import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { IInvoker } from '../../shared/interfaces/IInvoker';

import { ApiKeyError } from './ApiKeyError';
import { IGetApiKeyDomain } from './IGetApiKeyDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<Event, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IGetApiKeyDomain) {
  }

  async handler(_event: Event, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const apiKey = await this.domain.getApiKey(process.env.ENV! as 'dev|test|prod');
      return {
        statusCode: 200,
        body: JSON.stringify({
          apiKey,
        }),
      };
    } catch (e) {
      switch (true) {
        case e instanceof ApiKeyError.EmptyApiKey:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'API Key not found',
            }),
          };
        case e instanceof ApiKeyError.UnknownError:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `${e.message}`,
            }),
          };

        default:
          return {
            statusCode: 500,
            body: JSON.stringify(e),
          };
      }
    }
  }
}
