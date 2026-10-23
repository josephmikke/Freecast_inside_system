import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DistributorError } from '../../distributor/shared/DistributorError';
import { AddChannelEvent } from '../../shared/dto/ChannelDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { MediaPackageIdError } from '../../shared/valueObjects/MediaPackageId';
import { ThumbnailError } from '../../shared/valueObjects/Thumbnail';
import { ChannelError } from '../shared/ChannelError';

import { IAddChannelDomain } from './IAddChannelDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddChannelEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddChannelDomain;

  constructor(domain: IAddChannelDomain) {
    this.domain = domain;
  }

  async handler(event: AddChannelEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      const channel = await this.domain.addNewChannel(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/channels/${channel.id}`,
        },
      };
    } catch (e) {
      switch (true) {
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

        case e instanceof DistributorError.DistributorNotFound:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Invalid dependencies: Error: distributors',
            }),
          };

        case e instanceof ChannelError.UnableToSaveThumbnail:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to save Channel thumbnail',
            }),
          };

        case e instanceof ChannelError.ChannelStreamCreation:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to create Channel Stream, extId already taken',
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
