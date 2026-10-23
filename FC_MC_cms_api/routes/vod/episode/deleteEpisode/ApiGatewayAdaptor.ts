import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteEpisodeEvent } from '../../../shared/dto/vod/EpisodeDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { EpisodeError } from '../shared/EpisodeError';

import { IDeleteEpisodeDomain } from './IDeleteEpisodeDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteEpisodeEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IDeleteEpisodeDomain;

  constructor(domain: IDeleteEpisodeDomain) {
    this.domain = domain;
  }

  async handler(event: DeleteEpisodeEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.deleteEpisode(event.pathParameters.id);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        case e instanceof EpisodeError.EpisodeNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Episode Not Found',
            }),
          };

        case e instanceof EpisodeError.UnableToRemoveEpisode:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to remove episode: ${e}`,
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
