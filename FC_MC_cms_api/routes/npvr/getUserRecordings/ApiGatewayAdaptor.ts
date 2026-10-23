import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetRecordingsEvent } from '../../shared/dto/RecordingDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetRecordingsDomain } from './IGetRecordingsDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetRecordingsEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IGetRecordingsDomain) {
  }

  async handler(event: GetRecordingsEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const recordings = await this.domain.getRecordings(event.pathParameters.username);
      return {
        statusCode: 200,
        body: JSON.stringify({
          recordings,
        }),
      };
    } catch (e) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: e,
        }),
      };
    }
  }
}
