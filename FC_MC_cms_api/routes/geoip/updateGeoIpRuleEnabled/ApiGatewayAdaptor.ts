import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateGeoIpRuleEnabledEvent } from '../../shared/dto/GeoIpRuleDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { GeoIpRuleError } from '../shared/GeoIpRuleError';

import { IUpdateGeoIpRuleEnabledDomain } from './IUpdateGeoIpRuleEnabledDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateGeoIpRuleEnabledEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateGeoIpRuleEnabledDomain;

  constructor(domain: IUpdateGeoIpRuleEnabledDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateGeoIpRuleEnabledEvent, _context?: Context)
    : Promise<APIGatewayProxyResult> {
    const { pathParameters, body } = event;
    try {
      await this.domain.updateGeoIpRuleEnabled(pathParameters.id, body.enabled);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      switch (true) {
        case e instanceof GeoIpRuleError.NotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Rule Not Found',
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
