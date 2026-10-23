import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { GetGeoIpRulesEvent } from '../../shared/dto/GeoIpRuleDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';

import { IGetGeoIpRulesDomain } from './IGetGeoIpRulesDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<GetGeoIpRulesEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IGetGeoIpRulesDomain) {
  }

  async handler(event: GetGeoIpRulesEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    try {
      const { rules, nextToken } = await this.domain.getGeoIpRules(event.queryStringParameters);
      return {
        statusCode: 200,
        body: JSON.stringify({
          rules,
          nextToken,
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
