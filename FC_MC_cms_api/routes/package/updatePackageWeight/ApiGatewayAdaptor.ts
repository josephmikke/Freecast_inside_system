import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdatePackageWeightEvent } from '../../shared/dto/PackageDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { PackageError } from '../shared/PackageError';

import { IUpdatePackageWeightDomain } from './IUpdatePackageWeightDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdatePackageWeightEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdatePackageWeightDomain;

  constructor(domain: IUpdatePackageWeightDomain) {
    this.domain = domain;
  }

  async handler(event: UpdatePackageWeightEvent, _context?: Context)
    : Promise<APIGatewayProxyResult> {
    const { pathParameters } = event;
    try {
      await this.domain.updatePackageWeight(pathParameters.id, pathParameters.index);
      return {
        statusCode: 207,
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
        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
