import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetGenresEvent } from '../../shared/dto/GenreDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetGenresDomain } from './IGetGenresDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetGenresEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetGenresDomain;

  constructor(domain: IGetGenresDomain) {
    this.domain = domain;
  }

  async handler(_event: GetGenresEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const genres = await this.domain.getGenres();
      return {
        statusCode: 200,
        body: JSON.stringify({
          genres,
        }),
      };
    } catch (e) {
      switch (true) {
        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
