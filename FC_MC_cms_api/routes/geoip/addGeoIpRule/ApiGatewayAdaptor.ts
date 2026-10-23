import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { AddGeoIpRuleEvent } from '../../shared/dto/GeoIpRuleDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { FirewallError } from '../shared/FirewallError';
import {
  IPSetError,
} from '../shared/IPSetError';

import { IAddGeoIpRuleDomain } from './IAddGeoIpRuleDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<AddGeoIpRuleEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IAddGeoIpRuleDomain) {
    this.domain = domain;
  }

  async handler(event: AddGeoIpRuleEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { body } = event;
    try {
      const geoIpRule = await this.domain.addGeoIpRule(body);
      return {
        statusCode: 201,
        body: '',
        headers: {
          Location: `/rules/${geoIpRule.id}`,
        },
      };
    } catch (e) {
      console.log(e);
      switch (true) {
        case e instanceof IPSetError.UnableToCreateIpSet:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to create IP Set, ${e}`,
            }),
          };
        case e instanceof FirewallError.UnableToGetLockToken:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to get LockToken, ${e}`,
            }),
          };
        case e instanceof FirewallError.UnableToCreateACL:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to create Web ACL, ${e}`,
            }),
          };
        case e instanceof FirewallError.UnableToCreateRule:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to create create GeoIp rule, ${e}`,
            }),
          };

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
