import { GeoIpRuleRequestDto } from '../../shared/dto/GeoIpRuleDto';
import GeoIpRule from '../shared/GeoIpRule';

export interface IAddGeoIpRuleDomain {
  addGeoIpRule(rule: GeoIpRuleRequestDto): Promise<GeoIpRule>
}
