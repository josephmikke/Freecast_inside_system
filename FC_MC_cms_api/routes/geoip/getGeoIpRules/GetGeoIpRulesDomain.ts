import { GeoIpRuleQueryParameters } from '../../shared/dto/GeoIpRuleDto';
import { GeoIpRulesPage, IGeoIpRuleRepository } from '../shared/IGeoIpRuleRepository';

import { IGetGeoIpRulesDomain } from './IGetGeoIpRulesDomain';

export default class GetGeoIpRulesDomain implements IGetGeoIpRulesDomain {
  constructor(private readonly repository: IGeoIpRuleRepository) {
    this.repository = repository;
  }

  async getGeoIpRules(queryParams: GeoIpRuleQueryParameters): Promise<GeoIpRulesPage> {
    return this.repository.findAll({
      limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
      nextToken: queryParams.nextToken,
    });
  }
}
