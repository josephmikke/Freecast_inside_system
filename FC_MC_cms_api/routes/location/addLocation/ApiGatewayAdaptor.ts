import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { PackageError } from '../../package/shared/PackageError';
import { AddLocationEvent } from '../../shared/dto/LocationDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { LocationError } from '../shared/LocationError';

import { IAddLocationDomain } from './IAddLocationDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddLocationEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddLocationDomain;

  constructor(domain: IAddLocationDomain) {
    this.domain = domain;
  }

  async handler(event: AddLocationEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { body } = event;
      const locationItem = await this.domain.addNewLocation(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/locations/${locationItem.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof LocationError.LocationAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'Location already exist',
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
