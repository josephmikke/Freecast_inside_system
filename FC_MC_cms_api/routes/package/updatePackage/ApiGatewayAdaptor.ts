import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdatePackageEvent } from '../../shared/dto/PackageDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { PackageError } from '../shared/PackageError';

import { IUpdatePackageDomain } from './IUpdatePackageDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdatePackageEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdatePackageDomain;

  constructor(domain: IUpdatePackageDomain) {
    this.domain = domain;
  }

  async handler(event: UpdatePackageEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { pathParameters, body } = event;
    try {
      await this.domain.updatePackage(pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/packages/${pathParameters.id}`,
        },
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
        case e instanceof PackageError.PackageAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Package Already Exist',
            }),
          };
        case e instanceof PackageError.UnknownPackageDependency:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Invalid dependencies',
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
