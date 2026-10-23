import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteEPGTemplateEvent } from '../../shared/dto/EPGTemplateDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { EPGTemplateError } from '../shared/EPGTemplateError';

import { IDeleteEPGTemplateDomain } from './IDeleteEPGTemplateDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteEPGTemplateEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IDeleteEPGTemplateDomain) {}

  async handler(event: DeleteEPGTemplateEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { pathParameters } = event;
      await this.domain.deleteEPGTemplate(pathParameters.id);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        case e instanceof EPGTemplateError.EPGTemplateNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'EPG Template Not Found',
            }),
          };
        case e instanceof EPGTemplateError.EPGTemplateHasDependencies:
          return {
            statusCode: 422,
            body: JSON.stringify({
              error: 'Cannot delete an EPG Template with dependencies',
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
