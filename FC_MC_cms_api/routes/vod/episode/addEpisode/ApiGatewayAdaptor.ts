import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddEpisodeEvent } from '../../../shared/dto/vod/EpisodeDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { ThumbnailError } from '../../../shared/valueObjects/Thumbnail';
import { EpisodeError } from '../shared/EpisodeError';

import { IAddEpisodeDomain } from './IAddEpisodeDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddEpisodeEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddEpisodeDomain;

  constructor(domain: IAddEpisodeDomain) {
    this.domain = domain;
  }

  async handler(event: AddEpisodeEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      const episode = await this.domain.addNewEpisode(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/episodes/${episode.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof EpisodeError.EpisodeAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Episode already exist',
            }),
          };

        case e instanceof EpisodeError.SeriesNotFound:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: `Invalid Series: ${e}`,
            }),
          };

        case e instanceof EpisodeError.UnknownEpisodeDependency:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: `Invalid dependencies: ${e}`,
            }),
          };

        case e instanceof EpisodeError.UnableToSaveThumbnail:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to save Episode thumbnail',
            }),
          };

        case e instanceof EpisodeError.EpisodeStreamCreation:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to create Episode Stream, extId already taken',
            }),
          };

        case e instanceof ThumbnailError.InvalidThumbnail:
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: 'Invalid Base64 Thumbnail (Mime is required)',
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
