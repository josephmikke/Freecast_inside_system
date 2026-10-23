import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetEPGEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { EPGError } from '../shared/EPGError';

import { IGetEPGDomain } from './IGetEPGDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetEPGEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IGetEPGDomain) {
  }

  async handler(event: GetEPGEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const epg = await this.domain.getEPG(event.pathParameters.id, event.queryStringParameters);
      return {
        statusCode: 200,
        body: JSON.stringify(epg),
      };
    } catch (e) {
      switch (true) {
        case e instanceof EPGError.EPGNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'EPG Not Found',
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
