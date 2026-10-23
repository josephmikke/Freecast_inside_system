import { CommonEntityPayload, CommonEntityResult } from '@entities/common';

export type GeoIPRulePolicyType = 'ALLOW' | 'BLOCK';
export type GeoIPRuleRuleType = 'LOCATION' | 'SUBNET' | 'SPECIFIC_IP' | 'USER_AGENT';

interface GeoIPRuleResult extends CommonEntityResult {
  description: string;
  policyType: GeoIPRulePolicyType;
  ruleType: GeoIPRuleRuleType;
  value: string;
  packages: any[];
}

interface GeoIPRulePayload extends CommonEntityPayload {
  description: string;
  policyType: GeoIPRulePolicyType;
  ruleType: GeoIPRuleRuleType;
  value: string;
}

export type { GeoIPRuleResult, GeoIPRulePayload };
