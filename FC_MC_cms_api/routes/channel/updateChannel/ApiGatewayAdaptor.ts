import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DistributorError } from '../../distributor/shared/DistributorError';
import { UpdateChannelEvent } from '../../shared/dto/ChannelDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { MediaPackageIdError } from '../../shared/valueObjects/MediaPackageId';
import { ThumbnailError } from '../../shared/valueObjects/Thumbnail';
import { StreamError } from '../../stream/shared/StreamError';
import { ChannelError } from '../shared/ChannelError';

import { IUpdateChannelDomain } from './IUpdateChannelDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateChannelEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateChannelDomain;

  constructor(domain: IUpdateChannelDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateChannelEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      await this.domain.updateChannel(event.pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/channels/${event.pathParameters.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof ChannelError.ChannelNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Channel Not Found',
            }),
          };

        case e instanceof ChannelError.ChannelAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Channel already exist',
            }),
          };

        case e instanceof ChannelError.UnknownChannelDependency:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: `Invalid dependencies: ${e}`,
            }),
          };

        case e instanceof ChannelError.ChannelStreamCreation:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to create Channel Stream, extId already taken',
            }),
          };

        case e instanceof StreamError.MalformedStreamDependency:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Attributes are missing for Channel Stream creation',
            }),
          };

        case e instanceof DistributorError.DistributorNotFound:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Invalid dependencies: Error: distributors',
            }),
          };

        case e instanceof ChannelError.UnableToUpdateChannel:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to Update Channel: ${e}`,
            }),
          };

        case e instanceof ThumbnailError.InvalidThumbnail:
          return {
            statusCode: 400,
            body: JSON.stringify({
              error: 'Invalid Base64 Thumbnail (Mime is required)',
            }),
          };

        case e instanceof MediaPackageIdError.InvalidMediaPackageId:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Invalid MediaPackage id',
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
