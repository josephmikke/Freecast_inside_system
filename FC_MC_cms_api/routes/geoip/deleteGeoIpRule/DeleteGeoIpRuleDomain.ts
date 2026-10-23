import { Rule } from '@aws-sdk/client-wafv2';

import { GeoIpRuleType } from '../../shared/dto/GeoIpRuleDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { GeoIpRuleError } from '../shared/GeoIpRuleError';
import { IFirewallAdaptor } from '../shared/IFirewallAdaptor';
import { IGeoIpRuleRepository } from '../shared/IGeoIpRuleRepository';
import { IIPSet } from '../shared/IIPSet';
import { IRuleGroup } from '../shared/IRuleGroup';
import { RuleGroup } from '../shared/RuleGroupAdaptor';

import { IDeleteGeoIpRuleDomain } from './IDeleteGeoIpRuleDomain';

export default class DeleteGeoIpRuleDomain implements IDeleteGeoIpRuleDomain {
  constructor(
    private readonly firewallAdaptor: IFirewallAdaptor<Rule>,
    private readonly geoIpRuleRepository: IGeoIpRuleRepository,
    private readonly ipSetAdaptor: IIPSet,
    private readonly ruleGroupAdaptor: IRuleGroup<Rule[], RuleGroup | undefined>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
  }

  async deleteGeoIpRule(id: string): Promise<boolean> {
    const exists = await this.geoIpRuleRepository.findOne(id);
    if (!exists) throw new GeoIpRuleError.NotFound();
    await this.geoIpRuleRepository.remove(exists);
    const { rules: currentRules } = await this.geoIpRuleRepository.findAll();
    const updatedCategories = currentRules.map((item, key) => {
      item.updateWeight(key);
      return item;
    });
    await this.geoIpRuleRepository.updateWeight(updatedCategories);
    const rules = await this.firewallAdaptor.createRule();
    await this.firewallAdaptor.createACL(rules);
    if (exists.packages.length) {
      await this.ruleGroupAdaptor.delete(exists.name);
    }
    if (exists.ruleType === GeoIpRuleType.CIDR) {
      await this.ipSetAdaptor.delete(exists.name);
    }
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.GEOIP_RULE,
      entityId: exists.id,
    });
    return true;
  }
}
