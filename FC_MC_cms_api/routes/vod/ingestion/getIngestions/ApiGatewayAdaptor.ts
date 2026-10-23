import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetIngestionsEvent } from '../../../shared/dto/vod/IngestDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';

import { IGetIngestionsDomain } from './IGetIngestionsDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetIngestionsEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetIngestionsDomain;

  constructor(domain: IGetIngestionsDomain) {
    this.domain = domain;
  }

  async handler(event: GetIngestionsEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { ingestions, nextToken } = await this.domain
        .getIngestions(event.queryStringParameters);
      return {
        statusCode: 200,
        body: JSON.stringify({ ingestions, nextToken }),
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
