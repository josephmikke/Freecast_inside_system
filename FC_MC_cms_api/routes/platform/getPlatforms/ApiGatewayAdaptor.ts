import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetPlatformsEvent } from '../../shared/dto/PlatformDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetPlatformsDomain } from './IGetPlatformsDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetPlatformsEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetPlatformsDomain;

  constructor(domain: IGetPlatformsDomain) {
    this.domain = domain;
  }

  async handler(_event: GetPlatformsEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const platforms = await this.domain.getPlatforms();
      return {
        statusCode: 200,
        body: JSON.stringify({
          platforms,
        }),
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
