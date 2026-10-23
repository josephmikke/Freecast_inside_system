import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteRecordingsEvent, GetRecordingsEvent } from '../../shared/dto/RecordingDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IDeleteRecordingsDomain } from './IDeleteRecordingsDomain';

export interface RecordingBulkDelete {
  id: string;
  statusCode: number;
}

export default class ApiGatewayAdaptor implements
    IInvoker<GetRecordingsEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IDeleteRecordingsDomain<RecordingBulkDelete[]>) {
  }

  async handler(event: DeleteRecordingsEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const responses = await this.domain
        .deleteRecordings(event.pathParameters.username, event.body.ids);
      return {
        statusCode: 207,
        body: JSON.stringify({
          responses,
        }),
      };
    } catch (e) {
      switch (true) {
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
