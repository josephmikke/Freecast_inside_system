import { Rule } from '@aws-sdk/client-wafv2';

import { GeoIpRuleDto, GeoIpRuleRequestDto } from '../../shared/dto/GeoIpRuleDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import GeoIpRule from '../shared/GeoIpRule';
import { IFirewallAdaptor } from '../shared/IFirewallAdaptor';
import { IGeoIpRuleRepository } from '../shared/IGeoIpRuleRepository';

import { IAddGeoIpRuleDomain } from './IAddGeoIpRuleDomain';

export default class AddGeoIpRuleDomain implements IAddGeoIpRuleDomain {
  constructor(
    private readonly factory: IFactory<GeoIpRule, GeoIpRuleRequestDto, GeoIpRuleDto>,
    private readonly firewallAdaptor: IFirewallAdaptor<Rule>,
    private readonly geoIpRuleRepository: IGeoIpRuleRepository,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
  }

  async addGeoIpRule(rule: GeoIpRuleRequestDto): Promise<GeoIpRule> {
    const { rules: existingRules } = await this.geoIpRuleRepository.findAll({ limit: 1000 });
    const geoIpRule = await this.factory.toDomain({ weight: existingRules.length, ...rule });
    const rules = await this.firewallAdaptor.createRule(geoIpRule);
    await this.firewallAdaptor.createACL(rules);
    await this.geoIpRuleRepository.save(geoIpRule);
    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.GEOIP_RULE,
      entityId: geoIpRule.id,
    });
    return geoIpRule;
  }
}
