import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateEPGTemplateEvent } from '../../shared/dto/EPGTemplateDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { EPGTemplateError } from '../shared/EPGTemplateError';

import { IUpdateEPGTemplateDomain } from './IUpdateEPGTemplateDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateEPGTemplateEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IUpdateEPGTemplateDomain) {}

  async handler(event: UpdateEPGTemplateEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { pathParameters, body } = event;
    try {
      await this.domain.updateEpgTemplate(pathParameters.id, body);
      return {
        statusCode: 204,
        body: '',
        headers: {
          Location: `/epgTemplates/${pathParameters.id}`,
        },
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
        case e instanceof EPGTemplateError.EPGTemplateAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'EPG Template Already Exist',
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
