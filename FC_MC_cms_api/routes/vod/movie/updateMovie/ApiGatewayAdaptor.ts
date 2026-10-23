import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DistributorError } from '../../../distributor/shared/DistributorError';
import { UpdateMovieEvent } from '../../../shared/dto/vod/MovieDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { ThumbnailError } from '../../../shared/valueObjects/Thumbnail';
import { StreamError } from '../../../stream/shared/StreamError';
import { MovieError } from '../shared/MovieError';

import { IUpdateMovieDomain } from './IUpdateMovieDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateMovieEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateMovieDomain;

  constructor(domain: IUpdateMovieDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateMovieEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      await this.domain.updateMovie(event.pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/movies/${event.pathParameters.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof MovieError.MovieNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Movie Not Found',
            }),
          };

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

        case e instanceof MovieError.MovieStreamCreation:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to create Movie Stream, extId already taken',
            }),
          };

        case e instanceof StreamError.MalformedStreamDependency:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Attributes are missing for Movie Stream creation',
            }),
          };

        case e instanceof DistributorError.DistributorNotFound:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Invalid dependencies: Error: distributors',
            }),
          };

        case e instanceof MovieError.UnableToUpdateMovie:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to Update Movie: ${e}`,
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
