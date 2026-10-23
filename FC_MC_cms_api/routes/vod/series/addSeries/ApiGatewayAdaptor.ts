import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DistributorError } from '../../../distributor/shared/DistributorError';
import { AddSeriesEvent } from '../../../shared/dto/vod/SeriesDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { ThumbnailError } from '../../../shared/valueObjects/Thumbnail';
import { SeriesError } from '../shared/SeriesError';

import { IAddSeriesDomain } from './IAddSeriesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddSeriesEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddSeriesDomain;

  constructor(domain: IAddSeriesDomain) {
    this.domain = domain;
  }

  async handler(event: AddSeriesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      const series = await this.domain.addNewSeries(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/series/${series.id}`,
        },
      };
    } catch (e) {
      switch (true) {
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

        case e instanceof SeriesError.UnableToSaveThumbnail:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to save Series thumbnail',
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
