import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { UpdateGeoIpRuleWeightEvent } from '../../shared/dto/GeoIpRuleDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { GeoIpRuleError } from '../shared/GeoIpRuleError';

import { IUpdateGeoIpRuleWeightDomain } from './IUpdateGeoIpRuleWeightDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<UpdateGeoIpRuleWeightEvent, Context, APIGatewayProxyResult> {
  private readonly domain: IUpdateGeoIpRuleWeightDomain;

  constructor(domain: IUpdateGeoIpRuleWeightDomain) {
    this.domain = domain;
  }

  async handler(event: UpdateGeoIpRuleWeightEvent, _context?: Context)
    : Promise<APIGatewayProxyResult> {
    const { pathParameters } = event;
    try {
      await this.domain.updateGeoIpRuleWeight(pathParameters.id, pathParameters.index);
      return {
        statusCode: 207,
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
