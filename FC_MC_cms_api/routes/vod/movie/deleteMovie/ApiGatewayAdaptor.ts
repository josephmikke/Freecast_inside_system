import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteMovieEvent } from '../../../shared/dto/vod/MovieDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { MovieError } from '../shared/MovieError';

import { IDeleteMovieDomain } from './IDeleteMovieDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteMovieEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IDeleteMovieDomain;

  constructor(domain: IDeleteMovieDomain) {
    this.domain = domain;
  }

  async handler(event: DeleteMovieEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.deleteMovie(event.pathParameters.id);
      return {
        statusCode: 204,
        body: '',
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

        case e instanceof MovieError.UnableToRemoveMovie:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to remove movie: ${e}`,
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
