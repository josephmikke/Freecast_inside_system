import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetEpisodeEvent } from '../../../shared/dto/vod/EpisodeDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { EpisodeError } from '../../episode/shared/EpisodeError';
import { SeriesError } from '../shared/SeriesError';

import { IGetEpisodeDomain } from './IGetEpisodeDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetEpisodeEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetEpisodeDomain;

  constructor(domain: IGetEpisodeDomain) {
    this.domain = domain;
  }

  async handler(event: GetEpisodeEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const series = await this.domain.getEpisode(
        event.pathParameters.id,
        event.pathParameters.episodeId,
      );
      return {
        statusCode: 200,
        body: JSON.stringify(series),
      };
    } catch (e) {
      switch (true) {
        case e instanceof SeriesError.SeriesNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Series Not Found',
            }),
          };

        case e instanceof EpisodeError.EpisodeNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Episode Not Found',
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
