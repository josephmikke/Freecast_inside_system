import { WAFV2Client } from '@aws-sdk/client-wafv2';
import { mockClient } from 'aws-sdk-client-mock';

import { GeoIpRulePolicyType } from '../../../shared/dto/GeoIpRuleDto';
import CountryCode from '../../../shared/valueObjects/CountryCode';
import RuleBuilder from '../RuleBuilder';

const wafMock = mockClient(WAFV2Client);

describe('Rule Builder', () => {
  describe('Build rule without packages', () => {
    beforeAll(() => {
      wafMock.reset();
    });

    it('should create a rule that blocks all FR users', () => {
      const builder = new RuleBuilder();

      // Act
      builder.setAction(GeoIpRulePolicyType.BLOCK);
      builder.setName('Block all FR traffic');
      builder.setLocationStatement(new CountryCode('FR'));

      // Assert
      expect(builder.getResult()).toEqual({
        Name: 'Block all FR traffic',
        Priority: 0,
        Statement: {
          GeoMatchStatement: {
            CountryCodes: [
              'FR',
            ],
          },
        },
        Action: {
          Block: {},
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'Block all FR traffic',
        },
      });
    });

    it('should create a rule that blocks a user-agent', () => {
      // Arrange
      const builder = new RuleBuilder();

      // Act
      builder.setAction(GeoIpRulePolicyType.BLOCK);
      builder.setName('Block Postman');
      builder.setUserAgentStatement('PostmanRuntime/7.29.2');

      // Assert
      expect(builder.getResult()).toEqual({
        Name: 'Block Postman',
        Priority: 0,
        Statement: {
          ByteMatchStatement: {
            SearchString: new TextEncoder().encode('PostmanRuntime/7.29.2'),
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
        },
        Action: {
          Block: {},
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'Block Postman',
        },
      });
    });

    it('should create a rule that blocks a specific ip', async () => {
      // Arrange
      const builder = new RuleBuilder();

      // Act
      const result = (await builder.setCIDRStatement('fake-arn'))
        .setAction(GeoIpRulePolicyType.BLOCK)
        .setName('Block this ip')
        .setPriority(1)
        .getResult();

      // Assert
      expect(result).toEqual({
        Name: 'Block this ip',
        Priority: 1,
        Statement: {
          IPSetReferenceStatement: {
            ARN: 'fake-arn',
          },
        },
        Action: {
          Block: {},
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'Block this ip',
        },
      });
    });

    it('should create a rule with and statement', async () => {
      // Arrange
      const ids = ['1179f4e0839f455eb79fea7a5621ce42',
        'b46d9c71080742419e2eedb49e89140c',
        '971f8b30a6d24abe9ec6545837239972',
        '2024c903021242aa8cfa7d87e93c4619'];
      const builder = new RuleBuilder();

      // Act
      const result = builder.setName('Block FR')
        .setAction(GeoIpRulePolicyType.BLOCK)
        .setAndStatement(builder.setLocationStatement(
          new CountryCode('FR'),
        ).getResult().Statement!, ids).getResult();

      // Assert
      expect(result).toEqual({
        Name: 'Block FR',
        Priority: 0,
        Statement: {
          AndStatement: {
            Statements: [{
              GeoMatchStatement: {
                CountryCodes: [
                  'FR',
                ],
              },
            }, {
              RegexMatchStatement: {
                RegexString: '1179f4e0839f455eb79fea7a5621ce42|b46d9c71080742419e2eedb49e89140c|971f8b30a6d24abe9ec6545837239972|2024c903021242aa8cfa7d87e93c4619',
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
        },
        Action: {
          Block: {},
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'Block FR',
        },
      });
    });

    it('should create a rule with and statement that blocks an ip', async () => {
      // Arrange
      const ids = ['1179f4e0839f455eb79fea7a5621ce42',
        'b46d9c71080742419e2eedb49e89140c',
        '971f8b30a6d24abe9ec6545837239972',
        '2024c903021242aa8cfa7d87e93c4619'];

      const builder = new RuleBuilder();

      // Act
      const result = builder.setName('Block this ip')
        .setAction(GeoIpRulePolicyType.BLOCK)
        .setAndStatement((await builder.setCIDRStatement('fake-arn'))
          .getResult().Statement!, ids).getResult();

      // Assert
      expect(result).toEqual({
        Name: 'Block this ip',
        Priority: 0,
        Statement: {
          AndStatement: {
            Statements: [{
              IPSetReferenceStatement: {
                ARN: 'fake-arn',
              },
            }, {
              RegexMatchStatement: {
                RegexString: '1179f4e0839f455eb79fea7a5621ce42|b46d9c71080742419e2eedb49e89140c|971f8b30a6d24abe9ec6545837239972|2024c903021242aa8cfa7d87e93c4619',
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
        },
        Action: {
          Block: {},
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'Block this ip',
        },
      });
    });
  });
});
