import {
  CreateRuleGroupCommand,
  DeleteRuleGroupCommand, GetRuleGroupCommand,
  ListRuleGroupsCommand,
  RuleGroupSummary,
  WAFV2Client,
} from '@aws-sdk/client-wafv2';
import { Rule } from '@aws-sdk/client-wafv2';

import { FirewallError } from './FirewallError';
import { IRuleGroup } from './IRuleGroup';
import { RuleGroupError } from './RuleGroupError';

export interface RuleGroup {
  lockToken?: string;
  id?: string;
  name?: string;
  arn?: string;
  description?: string;
  rules: Rule[] | []
}
export default class RuleGroupAdaptor implements IRuleGroup<Rule[], RuleGroup | undefined> {
  constructor(private readonly client: WAFV2Client) {
  }

  private async listRuleGroups() {
    const command = new ListRuleGroupsCommand({
      Scope: 'CLOUDFRONT',
      Limit: 100,
    });
    const { RuleGroups } = await this.client.send(command) || {};
    return RuleGroups;
  }

  private async findRuleGroupByName(
    name: string,
    ruleGroups: RuleGroupSummary[],
  ): Promise<RuleGroup | undefined> {
    const [item] = ruleGroups.filter((rule) => rule.Name === name);
    if (!item) return undefined;
    const command = new GetRuleGroupCommand({
      Name: item.Name,
      Scope: 'CLOUDFRONT',
      Id: item.Id,
      ARN: item.ARN,
    });
    const { RuleGroup } = await this.client.send(command);
    return {
      lockToken: item.LockToken,
      id: item.Id,
      name: item.Name,
      arn: item.ARN,
      description: item.Description,
      rules: RuleGroup?.Rules ?? [],
    };
  }

  async create(name: string, rules: Rule[]): Promise<string> {
    try {
      const command = new CreateRuleGroupCommand({
        Name: name,
        Scope: 'CLOUDFRONT',
        Rules: rules,
        Description: 'Access Control List for MediaPackage CloudFront distribution',
        Capacity: 5 * rules.length,
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: process.env.WEB_ACL_NAME,
        },
      });
      const { Summary } = await this.client.send(command);
      if (!Summary?.ARN) throw new FirewallError.UnableToCreateRule('Arn is undefined');
      return Summary?.ARN;
    } catch (e) {
      throw new FirewallError.UnableToCreateRule(e);
    }
  }

  async delete(name: string): Promise<boolean> {
    const ruleGroups = await this.listRuleGroups();
    if (!ruleGroups) {
      throw new RuleGroupError.RuleGroupsNotFound();
    }
    const { lockToken, id } = await this.findRuleGroupByName(name, ruleGroups) || {};
    if (!lockToken) {
      throw new RuleGroupError.RuleGroupNotFound();
    }
    try {
      const command = new DeleteRuleGroupCommand({
        Name: name,
        Scope: 'CLOUDFRONT',
        Id: id,
        LockToken: lockToken,
      });
      return !!await this.client.send(command);
    } catch (e) {
      throw new RuleGroupError.UnableToDeleteRuleGroup(e);
    }
  }

  async exists(name: string): Promise<undefined | RuleGroup> {
    const ruleGroups = await this.listRuleGroups();
    if (!ruleGroups) return ruleGroups;
    return this.findRuleGroupByName(name, ruleGroups);
  }

  async update(name: string, rules: Rule[]): Promise<string> {
    await this.delete(name);
    return this.create(name, rules);
  }
}
