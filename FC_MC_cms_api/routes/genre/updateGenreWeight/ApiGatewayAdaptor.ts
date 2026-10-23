import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateGenreWeightEvent } from '../../shared/dto/GenreDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { GenreError } from '../shared/GenreError';

import { IUpdateGenreWeightDomain } from './IUpdateGenreWeightDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateGenreWeightEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateGenreWeightDomain;

  constructor(domain: IUpdateGenreWeightDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateGenreWeightEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { pathParameters } = event;
    try {
      await this.domain.updateGenreWeight(pathParameters.id, pathParameters.index);
      return {
        statusCode: 207,
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
        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
