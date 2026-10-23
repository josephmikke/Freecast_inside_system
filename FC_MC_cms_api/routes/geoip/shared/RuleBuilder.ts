import { Statement } from '@aws-sdk/client-wafv2';
import { Rule } from '@aws-sdk/client-wafv2';

import { GeoIpRulePolicyType } from '../../shared/dto/GeoIpRuleDto';
import CountryCode from '../../shared/valueObjects/CountryCode';

import { IRuleBuilder } from './IRuleBuilder';

export default class RuleBuilder implements IRuleBuilder<Rule, Statement> {
  private rule: Rule = {
    Name: '',
    Priority: 0,
    Statement: {},
    VisibilityConfig: {
      SampledRequestsEnabled: true,
      CloudWatchMetricsEnabled: true,
      MetricName: '',
    },
  };

  setName(name: string): this {
    this.rule.Name = name;
    this.rule.VisibilityConfig!.MetricName = name;
    return this;
  }

  getResult(): Rule {
    return this.rule;
  }

  create(): IRuleBuilder<Rule, Statement> {
    return new RuleBuilder();
  }

  setAction(policy: GeoIpRulePolicyType): this {
    if (policy === GeoIpRulePolicyType.ALLOW) {
      this.rule.Action = {
        Allow: {},
      };
      return this;
    }
    this.rule.Action = {
      Block: {},
    };
    return this;
  }

  setPriority(weight: number): this {
    this.rule.Priority = weight;
    return this;
  }

  async setCIDRStatement(arn: string): Promise<this> {
    this.rule.Statement = {
      ...this.rule.Statement,
      IPSetReferenceStatement: {
        ARN: arn,
      },
    };
    return this;
  }

  setLocationStatement(countryCode: CountryCode): this {
    this.rule.Statement = {
      ...this.rule.Statement,
      GeoMatchStatement: {
        CountryCodes: [
          // @ts-ignore
          countryCode.value(),
        ],
      },
    };
    return this;
  }

  setUserAgentStatement(userAgent: string): this {
    this.rule.Statement = {
      ...this.rule.Statement,
      ByteMatchStatement: {
        SearchString: new TextEncoder().encode(userAgent),
        FieldToMatch: {
          SingleHeader: {
            Name: 'user-agent',
          },
        },
        TextTransformations: [
          {
            Priority: 0,
            Type: 'NONE',
          },
        ],
        PositionalConstraint: 'EXACTLY',
      },
    };
    return this;
  }

  private buildRegex(ids: string[]): string {
    return ids.join('|');
  }

  setRuleGroup(arn: string) {
    this.rule.Statement = {
      RuleGroupReferenceStatement: {
        ARN: arn,
      },
    };
    this.rule = {
      ...this.rule,
      OverrideAction: {
        None: {},
      },
    };
    return this;
  }

  setAndStatement(firstStatement: Statement, ids: string[]): this {
    this.rule.Statement = {
      AndStatement: {
        Statements: [
          firstStatement,
          {
            RegexMatchStatement: {
              RegexString: this.buildRegex(ids),
              FieldToMatch: {
                UriPath: {},
              },
              TextTransformations: [
                {
                  Priority: 0,
                  Type: 'NONE',
                },
              ],
            },
          },
        ],
      },
    };
    return this;
  }
}
