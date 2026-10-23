import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetLocationsEvent } from '../../shared/dto/LocationDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetLocationsDomain } from './IGetLocationsDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetLocationsEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetLocationsDomain;

  constructor(domain: IGetLocationsDomain) {
    this.domain = domain;
  }

  async handler(_event: GetLocationsEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const locations = await this.domain.getLocations();
      return {
        statusCode: 200,
        body: JSON.stringify({ locations }),
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
