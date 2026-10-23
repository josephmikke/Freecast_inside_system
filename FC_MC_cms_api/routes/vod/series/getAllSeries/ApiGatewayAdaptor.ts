import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetAllSeriesEvent } from '../../../shared/dto/vod/SeriesDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { SeriesError } from '../shared/SeriesError';

import { IGetSeriesDomain } from './IGetSeriesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetAllSeriesEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetSeriesDomain;

  constructor(domain: IGetSeriesDomain) {
    this.domain = domain;
  }

  async handler(event: GetAllSeriesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { series, nextToken } = await this.domain.getSeries(event.queryStringParameters);
      return {
        statusCode: 200,
        body: JSON.stringify({ series, nextToken }),
      };
    } catch (e) {
      switch (true) {
        case e instanceof SeriesError.UnknownSeriesDependency:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: `Unknown series dependency ${e}`,
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
