import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddGenreEvent } from '../../shared/dto/GenreDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { GenreError } from '../shared/GenreError';

import { IAddGenreDomain } from './IAddGenreDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddGenreEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddGenreDomain;

  constructor(domain: IAddGenreDomain) {
    this.domain = domain;
  }

  async handler(event: AddGenreEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      const genre = await this.domain.addNewGenre(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/genres/${genre.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof GenreError.GenreAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Genre already exist',
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
