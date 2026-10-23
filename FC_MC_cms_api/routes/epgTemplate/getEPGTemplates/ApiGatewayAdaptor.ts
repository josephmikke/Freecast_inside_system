import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetEPGTemplatesEvent } from '../../shared/dto/EPGTemplateDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetEPGTemplatesDomain } from './IGetEPGTemplatesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetEPGTemplatesEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IGetEPGTemplatesDomain;

  constructor(domain: IGetEPGTemplatesDomain) {
    this.domain = domain;
  }

  async handler(_event: GetEPGTemplatesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const epgTemplates = await this.domain.getEPGTemplates();
      return {
        statusCode: 200,
        body: JSON.stringify({
          templates: epgTemplates,
        }),
      };
    } catch (e) {
      switch (true) {
        default:
          return {
            statusCode: 500,
            body: '',
          };
      }
    }
  }
}
