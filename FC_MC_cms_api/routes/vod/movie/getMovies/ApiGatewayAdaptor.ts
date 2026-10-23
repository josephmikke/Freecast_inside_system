import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetMoviesEvent } from '../../../shared/dto/vod/MovieDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { MovieError } from '../shared/MovieError';

import { IGetMoviesDomain } from './IGetMoviesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetMoviesEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetMoviesDomain;

  constructor(domain: IGetMoviesDomain) {
    this.domain = domain;
  }

  async handler(event: GetMoviesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { movies, nextToken } = await this.domain.getMovies(event.queryStringParameters);
      return {
        statusCode: 200,
        body: JSON.stringify({ movies, nextToken }),
      };
    } catch (e) {
      switch (true) {
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
