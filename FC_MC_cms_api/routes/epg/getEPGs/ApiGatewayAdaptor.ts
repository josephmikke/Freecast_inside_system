import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetEPGsEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetEPGsDomain } from './IGetEPGsDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetEPGsEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IGetEPGsDomain) {
  }

  async handler(event: GetEPGsEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const epgs = await this.domain.getEPGs(event.queryStringParameters);
      return {
        statusCode: 200, // TODO: check status code in other API routes (already done)
        body: JSON.stringify({ epgs }),
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
