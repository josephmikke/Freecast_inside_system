import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { RepairEPGEvent } from '../../shared/dto/EPGDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { EPGError } from '../shared/EPGError';
import { EventInvokerError } from '../shared/lambda/EventInvokerError';

import { IRepairEPGDomain } from './IRepairEPGDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<RepairEPGEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IRepairEPGDomain) {
  }

  async handler(event: RepairEPGEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      await this.domain.repairEPG(event.pathParameters.id);
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
            body: JSON.stringify({
              error: 'Internal Server Error',
            }),
          };
      }
    }
  }
}
