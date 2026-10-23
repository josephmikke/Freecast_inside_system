import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetAutoIngestionsEvent } from '../../shared/dto/AutoIngestionDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetAutoIngestionsDomain } from './IGetAutoIngestionsDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetAutoIngestionsEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IGetAutoIngestionsDomain) {}

  async handler(_event: GetAutoIngestionsEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const autoIngestions = await this.domain.getAutoIngestions();
      return {
        statusCode: 200,
        body: JSON.stringify({ autoIngestions }),
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: '',
      };
    }
  }
}
