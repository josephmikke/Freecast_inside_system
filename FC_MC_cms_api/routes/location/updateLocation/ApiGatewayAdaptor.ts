import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { PackageError } from '../../package/shared/PackageError';
import { UpdateLocationEvent } from '../../shared/dto/LocationDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { LocationError } from '../shared/LocationError';

import { IUpdateLocationDomain } from './IUpdateLocationDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateLocationEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateLocationDomain;

  constructor(domain: IUpdateLocationDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateLocationEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { pathParameters, body } = event;
    try {
      await this.domain.updateLocation(pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/locations/${pathParameters.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof LocationError.LocationNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Location Not Found',
            }),
          };
        case e instanceof LocationError.LocationAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Location Already Exist',
            }),
          };
        case e instanceof LocationError.UnknownLocationDependency:
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
