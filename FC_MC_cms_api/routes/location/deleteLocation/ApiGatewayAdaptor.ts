import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteLocationEvent } from '../../shared/dto/LocationDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { LocationError } from '../shared/LocationError';

import { IDeleteLocationDomain } from './IDeleteLocationDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteLocationEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IDeleteLocationDomain;

  constructor(domain: IDeleteLocationDomain) {
    this.domain = domain;
  }

  async handler(event: DeleteLocationEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { pathParameters } = event;
      await this.domain.deleteLocation(pathParameters.id);
      return {
        statusCode: 204,
        body: '',
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
        case e instanceof LocationError.LocationHasDependencies:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Cannot delete a Location with dependencies',
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
