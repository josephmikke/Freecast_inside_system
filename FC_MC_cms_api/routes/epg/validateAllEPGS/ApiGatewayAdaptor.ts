import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetEPGEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IValidateAllEPGsDomain } from './IValidateAllEPGsDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetEPGEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IValidateAllEPGsDomain) {
  }

  async handler(event: GetEPGEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      // Check if autoRepair is requested via query parameter
      const autoRepair = event.queryStringParameters?.autoRepair === 'true';

      const validationResult = await this.domain.validateAllEPGs(
        event.queryStringParameters,
        autoRepair,
      );

      return {
        statusCode: 200,
        body: JSON.stringify(validationResult),
      };
    } catch (e) {
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
