import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetSeriesEvent } from '../../../shared/dto/vod/SeriesDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { SeriesError } from '../shared/SeriesError';

import { IGetSeriesDomain } from './IGetSeriesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetSeriesEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetSeriesDomain;

  constructor(domain: IGetSeriesDomain) {
    this.domain = domain;
  }

  async handler(event: GetSeriesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const series = await this.domain.getSeries(event.pathParameters.id);
      return {
        statusCode: 200,
        body: JSON.stringify(series),
      };
    } catch (e) {
      switch (true) {
        case e instanceof SeriesError.SeriesNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Series Not Found',
            }),
          };

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
