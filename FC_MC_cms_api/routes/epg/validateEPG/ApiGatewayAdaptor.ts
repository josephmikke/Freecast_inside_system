import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetEPGEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { EPGError } from '../shared/EPGError';

import { IValidateEPGDomain } from './IValidateEPGDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetEPGEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IValidateEPGDomain) {
  }

  async handler(event: GetEPGEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const validationResult = await this.domain.validateEPG(
        event.pathParameters.id, 
        event.queryStringParameters
      );
      
      return {
        statusCode: 200,
        body: JSON.stringify(validationResult),
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
            body: JSON.stringify({
              error: 'Internal Server Error',
              message: e.message,
            }),
          };
      }
    }
  }
} 