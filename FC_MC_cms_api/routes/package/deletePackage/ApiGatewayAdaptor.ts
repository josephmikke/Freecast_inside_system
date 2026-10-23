import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeletePackageEvent } from '../../shared/dto/PackageDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { StorageError } from '../../shared/StorageError';
import { PackageError } from '../shared/PackageError';

import { IDeletePackageDomain } from './IDeletePackageDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeletePackageEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IDeletePackageDomain;

  constructor(domain: IDeletePackageDomain) {
    this.domain = domain;
  }

  async handler(event: DeletePackageEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { pathParameters } = event;
      await this.domain.deletePackage(pathParameters.id);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        case e instanceof PackageError.PackageNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Package Not Found',
            }),
          };
        case e instanceof PackageError.PackageHasDependencies:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Cannot delete a Package with dependencies',
            }),
          };
        case e instanceof PackageError.UnableToRemoveThumbnail:
        case e instanceof StorageError.UnableToDeleteFile:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Cannot delete Package thumbnail',
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
