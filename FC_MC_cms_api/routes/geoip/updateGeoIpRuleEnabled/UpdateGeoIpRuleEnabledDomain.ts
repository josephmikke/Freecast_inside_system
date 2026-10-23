import { Rule } from '@aws-sdk/client-wafv2';

import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { GeoIpRuleError } from '../shared/GeoIpRuleError';
import { IFirewallAdaptor } from '../shared/IFirewallAdaptor';
import { IGeoIpRuleRepository } from '../shared/IGeoIpRuleRepository';

import { IUpdateGeoIpRuleEnabledDomain } from './IUpdateGeoIpRuleEnabledDomain';

export default class UpdateGeoIpRuleEnabledDomain implements IUpdateGeoIpRuleEnabledDomain {
  constructor(
    private readonly repository: IGeoIpRuleRepository,
    private readonly firewallAdaptor: IFirewallAdaptor<Rule>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
  }

  async updateGeoIpRuleEnabled(id: string, enabled: boolean): Promise<boolean> {
    const rule = await this.repository.findOne(id);
    if (!rule) {
      throw new GeoIpRuleError.NotFound();
    }
    const updatedRule = Object.assign({}, rule, { enabled });
    await this.repository.save(updatedRule);
    await this.logTracker.track({
      event: LogEvent.UPDATE,
      entity: LogEntity.GEOIP_RULE,
      entityId: rule.id,
    });
    const updatedRules = await this.firewallAdaptor.createRule();
    return this.firewallAdaptor.createACL(updatedRules);
  }
}
