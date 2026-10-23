import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetMovieEvent } from '../../../shared/dto/vod/MovieDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { MovieError } from '../shared/MovieError';

import { IGetMovieDomain } from './IGetMovieDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetMovieEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetMovieDomain;

  constructor(domain: IGetMovieDomain) {
    this.domain = domain;
  }

  async handler(event: GetMovieEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const movie = await this.domain.getMovie(event.pathParameters.id);
      return {
        statusCode: 200,
        body: JSON.stringify(movie),
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

        case e instanceof MovieError.UnknownMovieDependency:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: `Unknown movie dependency ${e}`,
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
