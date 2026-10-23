import { Rule } from '@aws-sdk/client-wafv2';

import GeoIpRule from '../shared/GeoIpRule';
import { GeoIpRuleError } from '../shared/GeoIpRuleError';
import { IFirewallAdaptor } from '../shared/IFirewallAdaptor';
import { IGeoIpRuleRepository } from '../shared/IGeoIpRuleRepository';

import { IUpdateGeoIpRuleWeightDomain } from './IUpdateGeoIpRuleWeightDomain';

export default class UpdateGeoIpRuleWeightDomain implements IUpdateGeoIpRuleWeightDomain {
  constructor(
    private readonly repository: IGeoIpRuleRepository,
    private readonly firewallAdaptor: IFirewallAdaptor<Rule>,
  ) {
  }

  private static NOT_FOUND = 0;

  private changePosition(rules: GeoIpRule[], initialIndex: number, newIndex: number) {
    const [element] = rules.splice(initialIndex, 1);
    rules.splice(newIndex, 0, element);
    return rules.map((rule, key) => {
      rule.updateWeight(key);
      return rule;
    });
  }

  async updateGeoIpRuleWeight(id: string, index: string): Promise<boolean> {
    const { rules } = await this.repository.findAll({ limit: 1000 });
    const initialIndex = rules.findIndex((rule) => rule.id === id);
    if (initialIndex < UpdateGeoIpRuleWeightDomain.NOT_FOUND) {
      throw new GeoIpRuleError.NotFound();
    }
    const newArr = this.changePosition(rules, initialIndex, parseInt(index, 10));
    await this.repository.updateWeight(newArr);
    const updatedRules = await this.firewallAdaptor.createRule();
    return this.firewallAdaptor.createACL(updatedRules);
  }
}
