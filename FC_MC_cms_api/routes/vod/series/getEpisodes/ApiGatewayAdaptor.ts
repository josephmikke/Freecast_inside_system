import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetEpisodesEvent } from '../../../shared/dto/vod/EpisodeDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { SeriesError } from '../shared/SeriesError';

import { IGetEpisodesDomain } from './IGetEpisodesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetEpisodesEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetEpisodesDomain;

  constructor(domain: IGetEpisodesDomain) {
    this.domain = domain;
  }

  async handler(event: GetEpisodesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const series = await this.domain.getEpisodes(event.pathParameters.id);
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

        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
