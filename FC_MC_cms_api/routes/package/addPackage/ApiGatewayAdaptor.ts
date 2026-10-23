import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddPackageEvent } from '../../shared/dto/PackageDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { PackageError } from '../shared/PackageError';

import { IAddPackageDomain } from './IAddPackageDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddPackageEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddPackageDomain;

  constructor(domain: IAddPackageDomain) {
    this.domain = domain;
  }

  async handler(event: AddPackageEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      const packageItem = await this.domain.addNewPackage(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/packages/${packageItem.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof PackageError.PackageAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Package already exist',
            }),
          };
        case e instanceof PackageError.UnknownPackageDependency:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Invalid dependencies',
            }),
          };
        case e instanceof PackageError.UnableToSaveThumbnail:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Unable to save Package thumbnail',
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
