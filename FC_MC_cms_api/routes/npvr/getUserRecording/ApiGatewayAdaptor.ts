import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetRecordingEvent } from '../../shared/dto/RecordingDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { RecordingError } from '../shared/RecordingError';

import { IGetRecordingDomain } from './IGetRecordingDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetRecordingEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IGetRecordingDomain) {
  }

  async handler(event: GetRecordingEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { username, id } = event.pathParameters;
      const recording = await this.domain.getRecording(username, id);
      return {
        statusCode: 200,
        body: JSON.stringify(recording),
      };
    } catch (e) {
      switch (true) {
        case e instanceof RecordingError.RecordingNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Recording Not Found',
            }),
          };
        default:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: e,
            }),
          };
      }
    }
  }
}
