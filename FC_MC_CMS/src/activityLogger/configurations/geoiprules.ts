import {
  checkEntity, checkSimpleValue,
} from '@/activityLogger/common/checkers';
import { GeoIPRulePayload, GeoIPRuleResult } from '@entities/configurations/geoiprule';

export default function geoIpRulesActivityLogger(
  geoIpRuleBase: GeoIPRuleResult,
  geoIpRulePayload: GeoIPRulePayload,
) {
  // TODO : GEO IP RULES not done (not linked with the API yet)
  // Will need to update this checkers to match the new fields
  const updatedFields = checkEntity(geoIpRuleBase, geoIpRulePayload, {
    name: checkSimpleValue,
    description: checkSimpleValue,
  });

  console.log(updatedFields);
}
