import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteGenreEvent } from '../../shared/dto/GenreDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { GenreError } from '../shared/GenreError';

import { IDeleteGenreDomain } from './IDeleteGenreDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteGenreEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IDeleteGenreDomain;

  constructor(domain: IDeleteGenreDomain) {
    this.domain = domain;
  }

  async handler(event: DeleteGenreEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { pathParameters } = event;
      await this.domain.deleteGenre(pathParameters.id);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        case e instanceof GenreError.GenreNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Genre Not Found',
            }),
          };
        case e instanceof GenreError.GenreHasDependencies:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Cannot delete a Genre with dependencies',
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
