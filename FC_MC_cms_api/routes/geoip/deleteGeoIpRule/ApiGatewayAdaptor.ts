import { APIGatewayProxyResult, Context } from 'aws-lambda';

import { DeleteGeoIpRuleEvent } from '../../shared/dto/GeoIpRuleDto';
import { IInvoker } from '../../shared/interfaces/IInvoker';
import { GeoIpRuleError } from '../shared/GeoIpRuleError';
import { IPSetError } from '../shared/IPSetError';
import { RuleGroupError } from '../shared/RuleGroupError';

import { IDeleteGeoIpRuleDomain } from './IDeleteGeoIpRuleDomain';

export default class ApiGatewayAdaptor implements
    IInvoker<DeleteGeoIpRuleEvent, Context, APIGatewayProxyResult> {
  constructor(private readonly domain: IDeleteGeoIpRuleDomain) {
    this.domain = domain;
  }

  async handler(event: DeleteGeoIpRuleEvent, _context?: Context): Promise<APIGatewayProxyResult> {
    const { pathParameters } = event;
    try {
      await this.domain.deleteGeoIpRule(pathParameters.id);
      return {
        statusCode: 204,
        body: '',
      };
    } catch (e) {
      console.log('errrrorrr', e);
      switch (true) {
        case e instanceof GeoIpRuleError.NotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Rule Not Found',

            }),
          };
        case e instanceof IPSetError.IPSetNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'IPSet Not Found',
            }),
          };
        case e instanceof IPSetError.IPSetsNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'IPSets Not Found',
            }),
          };
        case e instanceof IPSetError.UnableToDeleteIpSet:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to delete IPSet ${e}`,
            }),
          };
        case e instanceof RuleGroupError.RuleGroupNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Rule Group Not Found',
            }),
          };
        case e instanceof RuleGroupError.RuleGroupsNotFound:
          return {
            statusCode: 404,
            body: JSON.stringify({
              error: 'Rule Groups Not Found',
            }),
          };
        case e instanceof RuleGroupError.UnableToDeleteRuleGroup:
          return {
            statusCode: 500,
            body: JSON.stringify({
              error: `Unable to delete Rule Group ${e}`,
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
