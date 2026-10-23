import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteSeriesEvent } from '../../../shared/dto/vod/SeriesDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { SeriesError } from '../shared/SeriesError';

import { IDeleteSeriesDomain } from './IDeleteSeriesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteSeriesEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IDeleteSeriesDomain;

  constructor(domain: IDeleteSeriesDomain) {
    this.domain = domain;
  }

  async handler(event: DeleteSeriesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.deleteSeries(event.pathParameters.id);
      return {
        statusCode: 204,
        body: '',
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

        case e instanceof SeriesError.SeriesHasDependencies:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Cannot delete a Series with dependencies',
            }),
          };

        case e instanceof SeriesError.UnableToRemoveSeries:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to remove series: ${e}`,
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
