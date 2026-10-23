import { GeoIpRuleQueryParameters } from '../../shared/dto/GeoIpRuleDto';
import { GeoIpRulesPage } from '../shared/IGeoIpRuleRepository';

export interface IGetGeoIpRulesDomain {
  getGeoIpRules(queryParams: GeoIpRuleQueryParameters): Promise<GeoIpRulesPage>
}
