import { GeoIpRuleParameters } from '../../shared/dto/GeoIpRuleDto';

import GeoIpRule from './GeoIpRule';

export interface GeoIpRulesPage {
  rules: GeoIpRule[];
  nextToken?: string;
}

export interface IGeoIpRuleRepository {
  save(geoIpRule: GeoIpRule): Promise<boolean>;
  findOne(id: string): Promise<GeoIpRule | undefined>;
  remove(geoIpRule: GeoIpRule): Promise<boolean>;
  findAll(queryParams?: GeoIpRuleParameters): Promise<GeoIpRulesPage>;
  updateWeight(rules: GeoIpRule[]): Promise<boolean>
}
