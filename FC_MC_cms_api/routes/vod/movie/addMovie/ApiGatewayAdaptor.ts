import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DistributorError } from '../../../distributor/shared/DistributorError';
import { AddMovieEvent } from '../../../shared/dto/vod/MovieDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { ThumbnailError } from '../../../shared/valueObjects/Thumbnail';
import { MovieError } from '../shared/MovieError';

import { IAddMovieDomain } from './IAddMovieDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddMovieEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddMovieDomain;

  constructor(domain: IAddMovieDomain) {
    this.domain = domain;
  }

  async handler(event: AddMovieEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      const movie = await this.domain.addNewMovie(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/movies/${movie.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof MovieError.MovieAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Movie already exist',
            }),
          };

        case e instanceof MovieError.UnknownMovieDependency:
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

        case e instanceof MovieError.UnableToSaveThumbnail:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to save Movie thumbnail',
            }),
          };

        case e instanceof MovieError.MovieStreamCreation:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to create Movie Stream, extId already taken',
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
