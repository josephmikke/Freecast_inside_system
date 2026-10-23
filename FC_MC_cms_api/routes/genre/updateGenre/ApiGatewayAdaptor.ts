import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateGenreEvent } from '../../shared/dto/GenreDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { GenreError } from '../shared/GenreError';

import { IUpdateGenreDomain } from './IUpdateGenreDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateGenreEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateGenreDomain;

  constructor(domain: IUpdateGenreDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateGenreEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { pathParameters, body } = event;
    try {
      await this.domain.updateGenre(pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/genres/${pathParameters.id}`,
        },
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
        case e instanceof GenreError.GenreAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Genre Already Exist',
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
