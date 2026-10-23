import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetIngestionEvent } from '../../../shared/dto/vod/IngestDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { IngestionError } from '../shared/IngestionError';

import { IGetIngestionDomain } from './IGetIngestionDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetIngestionEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetIngestionDomain;

  constructor(domain: IGetIngestionDomain) {
    this.domain = domain;
  }

  async handler(event: GetIngestionEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const ingestion = await this.domain.getIngestion(event.pathParameters.id);
      return {
        statusCode: 200,
        body: JSON.stringify(ingestion),
      };
    } catch (e) {
      switch (true) {
        case e instanceof IngestionError.IngestionNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Ingestion Not Found',
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
