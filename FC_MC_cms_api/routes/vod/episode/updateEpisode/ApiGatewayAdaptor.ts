import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateEpisodeEvent } from '../../../shared/dto/vod/EpisodeDto';
import { IInvoker } from '../../../shared/interfaces/IInvoker';
import { ThumbnailError } from '../../../shared/valueObjects/Thumbnail';
import { StreamError } from '../../../stream/shared/StreamError';
import { EpisodeError } from '../shared/EpisodeError';

import { IUpdateEpisodeDomain } from './IUpdateEpisodeDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateEpisodeEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateEpisodeDomain;

  constructor(domain: IUpdateEpisodeDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateEpisodeEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      await this.domain.updateEpisode(event.pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/episodes/${event.pathParameters.id}`,
        },
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

        case e instanceof EpisodeError.EpisodeStreamCreation:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to create Episode Stream, extId already taken',
            }),
          };

        case e instanceof StreamError.MalformedStreamDependency:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Attributes are missing for Episode Stream creation',
            }),
          };

        case e instanceof EpisodeError.UnableToUpdateEpisode:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to Update Episode: ${e}`,
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
