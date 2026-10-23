import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddEPGTemplateEvent } from '../../shared/dto/EPGTemplateDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { EPGTemplateError } from '../shared/EPGTemplateError';

import { IAddEPGTemplateDomain } from './IAddEPGTemplateDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddEPGTemplateEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IAddEPGTemplateDomain;

  constructor(domain: IAddEPGTemplateDomain) {
    this.domain = domain;
  }

  async handler(event: AddEPGTemplateEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { body } = event;
    try {
      const epgTemplate = await this.domain.addNewEPGTemplate(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/epgTemplates/${epgTemplate.id}`,
        },
      };
    } catch (e) {
      switch (true) {
        case e instanceof EPGTemplateError.EPGTemplateAlreadyExist:
          return {
            statusCode: 409,
            body: JSON.stringify({
              error: 'EPG Template already exist',
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
