import { APIGatewayProxyResult, Context } from 'aws-lambda';
import { IngestVodEvent } from 'routes/shared/dto/vod/IngestDto';

import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IIngestVodDomain } from './IIngestVodDomain';

export default class ApiGatewayAdaptor implements
  IInvoker<IngestVodEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IIngestVodDomain;

  constructor(domain: IIngestVodDomain) {
    this.domain = domain;
  }

  async handler(event: IngestVodEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      await this.domain.ingestVod(
        body.url,
        body.mapping,
        body.isPrivate ?? false,
        body.provider ?? '',
        body.packages ?? [],
        body.brands ?? [],
        body.distributors ?? [],
        body.locations ?? [],
        body.platforms ?? [],
      );
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        default:
          return {
            statusCode: 500,
            body: `${e}`,
          };
      }
    }
  }
}
