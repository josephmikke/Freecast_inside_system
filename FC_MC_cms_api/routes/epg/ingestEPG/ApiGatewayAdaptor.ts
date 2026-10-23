import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { IngestEPGEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { EPGError } from '../shared/EPGError';
import { EventInvokerError } from '../shared/lambda/EventInvokerError';

import { IIngestEPGDomain } from './IIngestEPGDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<IngestEPGEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IIngestEPGDomain) {
  }

  async handler(_event: IngestEPGEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.ingestEPG(_event.pathParameters.id);
      return {
        statusCode: 204,
        body: '',
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
        case e instanceof EventInvokerError.UnableToInvokeEvent:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Error: Unable to run ingestion target: ${e}`,
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
