import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetPackagesEvent } from '../../shared/dto/PackageDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetPackagesDomain } from './IGetPackagesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetPackagesEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetPackagesDomain;

  constructor(domain: IGetPackagesDomain) {
    this.domain = domain;
  }

  async handler(_event: GetPackagesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const packages = await this.domain.getPackages();
      return {
        statusCode: 200,
        body: JSON.stringify({ packages }),
      };
    } catch (e) {
      switch (true) {
        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
