import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DistributorError } from '../../../distributor/shared/DistributorError';
import { UpdateSeriesEvent } from '../../../shared/dto/vod/SeriesDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { ThumbnailError } from '../../../shared/valueObjects/Thumbnail';
import { SeriesError } from '../shared/SeriesError';

import { IUpdateSeriesDomain } from './IUpdateSeriesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateSeriesEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateSeriesDomain;

  constructor(domain: IUpdateSeriesDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateSeriesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      await this.domain.updateSeries(event.pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/series/${event.pathParameters.id}`,
        },
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

        case e instanceof SeriesError.SeriesAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Series already exist',
            }),
          };

        case e instanceof SeriesError.UnknownSeriesDependency:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: `Invalid dependencies: ${e}`,
            }),
          };

        case e instanceof DistributorError.DistributorNotFound:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Invalid dependencies: Error: distributors',
            }),
          };

        case e instanceof SeriesError.UnableToUpdateSeries:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to Update Series: ${e}`,
            }),
          };

        case e instanceof ThumbnailError.InvalidThumbnail:
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: 'Invalid Base64 Thumbnail (Mime is required)',
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
