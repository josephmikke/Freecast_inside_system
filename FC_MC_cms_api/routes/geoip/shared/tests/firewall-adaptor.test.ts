import { DescribeOriginEndpointCommand, MediaPackageClient } from '@aws-sdk/client-mediapackage';
import {
  CreateIPSetCommand,
  CreateRuleGroupCommand,
  GetWebACLCommand, ListIPSetsCommand,
  ListRuleGroupsCommand,
  UpdateWebACLCommand,
  WAFV2Client,
} from '@aws-sdk/client-wafv2';
import { mockClient } from 'aws-sdk-client-mock';

import { initDatabase } from '../../../../utils/jest-utils';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { GeoIpRulePolicyType, GeoIpRuleType } from '../../../shared/dto/GeoIpRuleDto';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import CIDR from '../../../shared/valueObjects/CIDR';
import FirewallAdaptor from '../FirewallAdaptor';
import GeoIpRuleFactory from '../GeoIpRuleFactory';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import GeoIpRuleRepository from '../GeoIpRuleRepository';
import IPSetAdaptor from '../IPSetAdaptor';
import OriginEndpoint from '../OriginEndpoint';
import RuleBuilder from '../RuleBuilder';
import RuleGroupAdaptor from '../RuleGroupAdaptor';

import createChannel from './GeoIpRuleHelper';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-firewallAdaptor');

describe('Firewall Adaptor', () => {
  const OLD_ENV = process.env;
  const wafMock = mockClient(WAFV2Client);
  const mediaPackageMock = mockClient(MediaPackageClient);

  beforeAll(() => {
    wafMock.reset();
    mediaPackageMock.reset();
  });

  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
    process.env = {
      WEB_ACL_NAME: 'prod-DistributionACL',
      WEB_ACL_ID: 'dfc706c0-1be2-457d-8fc4-e8a0fb8679f1',
    }; // Make a copy
    // mediaPackageMock.onAnyCommand().resolves({});
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  describe('transform', () => {
    it('should transform a GeoIpRule to allow all FR users', async () => {
      // Arrange
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});
      const originEndpointAdaptor = new OriginEndpoint(mpClient);
      const uid = new UIDGenerator();
      const platformFactory = new PlatformMap(uid);
      const platformRepository = new PlatformRepository(
        ddbClient,
        TEST_TABLE_NAME,
        platformFactory,
      );
      const packageFactory = new PackageFactory(uid, platformRepository);
      const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);
      const packageItem = await packageFactory.toDomain({
        default: false,
        description: 'Value Package',
        extId: 'value',
        name: 'Value',
        price: '1.99',
        revenueModel: RevenueModel.PAID,
        thumbnail: 'packages/packageid/thumbnail.png',
        type: PackageType.EXTERNAL,
        weight: 0,
      });
      await packageRepository.save(packageItem);

      const {
        channelRepository, seriesRepository,
        movieRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, {
        pkg: [packageItem],
      });

      const geoIpRuleFactory = new GeoIpRuleFactory(uid, packageRepository);
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.LOCATION,
        value: 'FR',
        weight: 0,
      });
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const firewallAdaptor = new FirewallAdaptor(
        wafClient,
        ruleBuilder,
        geoIpRuleRepository,
        channelRepository,
        originEndpointAdaptor,
        ipSetAdaptor,
        ruleGroupAdaptor,
        seriesRepository,
        movieRepository,
      );

      // Act
      const rule = await firewallAdaptor.transform(geoIpRule);

      // Assert
      expect(rule).toEqual({
        Name: 'Allow FR',
        Priority: 0,
        Statement: {
          GeoMatchStatement: {
            CountryCodes: [
              'FR',
            ],
          },
        },
        Action: {
          Allow: {},
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'Allow FR',
        },
      });
    });

    it('should transform a GeoIpRule to allow all FR users given packages', async () => {
      // Arrange
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});
      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolvesOnce({
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
        }).resolvesOnce({
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/b46d9c71080742419e2eedb49e89140c/index.mpd',
        })
        .resolvesOnce({
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/971f8b30a6d24abe9ec6545837239972/index.mpd',
        })
        .resolvesOnce({
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/2024c903021242aa8cfa7d87e93c4619/index.mpd',
        });
      wafMock.on(ListRuleGroupsCommand).resolves({
        NextMarker: 'STRING_VALUE',
        RuleGroups: [],
      });
      const originEndpointAdaptor = new OriginEndpoint(mpClient);
      const uid = new UIDGenerator();
      const platformFactory = new PlatformMap(uid);
      const platformRepository = new PlatformRepository(
        ddbClient,
        TEST_TABLE_NAME,
        platformFactory,
      );
      const packageFactory = new PackageFactory(uid, platformRepository);
      const packageItem = await packageFactory.toDomain({
        default: false,
        description: 'Value Package',
        extId: 'value',
        name: 'Value',
        price: '1.99',
        revenueModel: RevenueModel.PAID,
        thumbnail: 'packages/packageid/thumbnail.png',
        type: PackageType.EXTERNAL,
        weight: 0,
      });
      const platform = platformFactory.toDomain({ extId: 'chrome', name: 'Chrome' });
      await platformRepository.save(platform);
      packageItem.addPlatform(platform);
      const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);
      await packageRepository.save(packageItem);
      const { channelRepository, seriesRepository, movieRepository } = await createChannel(
        TEST_TABLE_NAME,
        ddbClient,
        { pkg: [packageItem] },
      );
      const geoIpRuleFactory = new GeoIpRuleFactory(uid, packageRepository);
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [packageItem.id],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.LOCATION,
        value: 'FR',
        weight: 2,
      });
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const firewallAdaptor = new FirewallAdaptor(
        wafClient,
        ruleBuilder,
        geoIpRuleRepository,
        channelRepository,
        originEndpointAdaptor,
        ipSetAdaptor,
        ruleGroupAdaptor,
        seriesRepository,
        movieRepository,
      );

      // Act
      const rule = await firewallAdaptor.transform(geoIpRule, [
        '1179f4e0839f455eb79fea7a5621ce42',
        'b46d9c71080742419e2eedb49e89140c',
        '971f8b30a6d24abe9ec6545837239972',
        '2024c903021242aa8cfa7d87e93c4619']);

      // Assert
      expect(rule).toEqual({
        Name: 'Allow FR',
        Priority: 2,
        Statement: {
          AndStatement: {
            Statements: [
              {
                GeoMatchStatement: {
                  CountryCodes: [
                    'FR',
                  ],
                },
              },
              {
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
          Allow: {},
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'Allow FR',
        },
      });
    });

    it('should transform a GeoIpRule to allow an IP given packages', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});
      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolvesOnce({
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
        }).resolvesOnce({
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/b46d9c71080742419e2eedb49e89140c/index.mpd',
        })
        .resolvesOnce({
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/971f8b30a6d24abe9ec6545837239972/index.mpd',
        })
        .resolvesOnce({
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/2024c903021242aa8cfa7d87e93c4619/index.mpd',
        });
      wafMock.on(ListRuleGroupsCommand).resolves({
        NextMarker: 'STRING_VALUE',
        RuleGroups: [],
      });
      wafMock.on(CreateIPSetCommand).resolves({ // CreateIPSetResponse
        Summary: { // IPSetSummary
          Name: 'Block One Ip',
          Id: 'cb1bd443-00f9-4c05-b69b-7dbc64056fa5',
          Description: 'Mocked description',
          LockToken: uid.generate(10),
          ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/ipset/IpSetName/uuid',
        },
      });
      const originEndpointAdaptor = new OriginEndpoint(mpClient);
      const platformFactory = new PlatformMap(uid);
      const platformRepository = new PlatformRepository(
        ddbClient,
        TEST_TABLE_NAME,
        platformFactory,
      );
      const packageFactory = new PackageFactory(uid, platformRepository);
      const packageItem = await packageFactory.toDomain({
        default: false,
        description: 'Value Package',
        extId: 'value',
        name: 'Value',
        price: '1.99',
        revenueModel: RevenueModel.PAID,
        thumbnail: 'packages/packageid/thumbnail.png',
        type: PackageType.EXTERNAL,
        weight: 0,
      });
      const platform = platformFactory.toDomain({ extId: 'chrome', name: 'Chrome' });
      await platformRepository.save(platform);
      packageItem.addPlatform(platform);
      const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);
      await packageRepository.save(packageItem);
      const { channelRepository, seriesRepository, movieRepository } = await createChannel(
        TEST_TABLE_NAME,
        ddbClient,
        { pkg: [packageItem] },
      );
      const geoIpRuleFactory = new GeoIpRuleFactory(uid, packageRepository);
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [packageItem.id],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.CIDR,
        value: '101.102.55.55/32',
        weight: 2,
      });
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const firewallAdaptor = new FirewallAdaptor(
        wafClient,
        ruleBuilder,
        geoIpRuleRepository,
        channelRepository,
        originEndpointAdaptor,
        ipSetAdaptor,
        ruleGroupAdaptor,
        seriesRepository,
        movieRepository,
      );

      // Act
      const rule = await firewallAdaptor.transform(geoIpRule, [
        '1179f4e0839f455eb79fea7a5621ce42',
        'b46d9c71080742419e2eedb49e89140c',
        '971f8b30a6d24abe9ec6545837239972',
        '2024c903021242aa8cfa7d87e93c4619']);

      // Assert
      expect(rule).toEqual({
        Name: 'Allow FR',
        Priority: 2,
        Statement: {
          AndStatement: {
            Statements: [{
              IPSetReferenceStatement: {
                ARN: new CIDR('101.102.55.55/32'),
              },
            },
            {
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
          Allow: {},
        },
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: 'Allow FR',
        },
      });
    });
  });

  describe('createRule', () => {
    it('should create a GeoIpRule to allow all FR users given packages', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});
      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
        });
      wafMock.on(ListRuleGroupsCommand).resolves({
        NextMarker: 'STRING_VALUE',
        RuleGroups: [],
      });
      wafMock.on(CreateRuleGroupCommand).resolvesOnce({
        Summary: {
          Name: 'vubiquity_Value_Reelz',
          Id: 'vubiquity_Value_Reelz',
          Description: 'Mocked description',
          LockToken: uid.generate(10),
          ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/rulegroup/GroupName/uuid',
        },
      }).resolvesOnce({
        Summary: {
          Name: 'vubiquity_Value_AXS',
          Id: 'vubiquity_Value_Reelz',
          Description: 'Mocked description',
          LockToken: uid.generate(10),
          ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/rulegroup/GroupName/uuid',
        },
      }).resolvesOnce({
        Summary: {
          Name: 'vubiquity_Value_Reelz',
          Id: 'vubiquity_Value_Reelz',
          Description: 'Mocked description',
          LockToken: uid.generate(10),
          ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/rulegroup/GroupName/uuid',
        },
      })
        .resolvesOnce({
          Summary: {
            Name: 'vubiquity_Value_AXS',
            Id: 'vubiquity_Value_Reelz',
            Description: 'Mocked description',
            LockToken: uid.generate(10),
            ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/rulegroup/GroupName/uuid',
          },
        });
      wafMock.on(CreateIPSetCommand).resolves({ // CreateIPSetResponse
        Summary: { // IPSetSummary
          Name: 'Block One Ip',
          Id: 'cb1bd443-00f9-4c05-b69b-7dbc64056fa5',
          Description: 'Mocked description',
          LockToken: uid.generate(10),
          ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/ipset/IpSetName/uuid',
        },
      });
      wafMock.on(ListIPSetsCommand).resolves({
        NextMarker: 'STRING_VALUE',
        IPSets: [],
      });
      wafMock.on(UpdateWebACLCommand).resolves({
        NextLockToken: uid.generate(10),
      });
      wafMock.on(GetWebACLCommand).resolves({
        // @ts-ignore
        WebACL: {
          Name: 'prod-WebACL', // required
          Id: 'cb1bd443-00f9-4c05-b69b-7dbc64056fa5', // required
          ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/webacl/uuid', // required,
        },
        ApplicationIntegrationURL: '',
        LockToken: uid.generate(10),
      });

      const originEndpointAdaptor = new OriginEndpoint(mpClient);
      const platformFactory = new PlatformMap(uid);
      const platformRepository = new PlatformRepository(
        ddbClient,
        TEST_TABLE_NAME,
        platformFactory,
      );
      const packageFactory = new PackageFactory(uid, platformRepository);
      const firstPackage = await packageFactory.toDomain({
        default: false,
        description: 'Value Package',
        extId: 'value',
        name: 'Value',
        price: '1.99',
        revenueModel: RevenueModel.PAID,
        thumbnail: 'packages/packageid/thumbnail.png',
        type: PackageType.EXTERNAL,
        weight: 0,
      });
      const secondPackage = await packageFactory.toDomain({
        default: false,
        description: 'Second Package',
        extId: 'second-pkg',
        name: 'Second Package',
        price: '1.99',
        revenueModel: RevenueModel.PAID,
        thumbnail: 'packages/packageid/thumbnail.png',
        type: PackageType.EXTERNAL,
        weight: 1,
      });
      const thirdPackage = await packageFactory.toDomain({
        default: false,
        description: 'Third Package',
        extId: 'third-pkg',
        name: 'Third Package',
        price: '1.99',
        revenueModel: RevenueModel.PAID,
        thumbnail: 'packages/packageid/thumbnail.png',
        type: PackageType.EXTERNAL,
        weight: 1,
      });
      const platform = platformFactory.toDomain({ extId: 'chrome', name: 'Chrome' });
      await platformRepository.save(platform);
      firstPackage.addPlatform(platform);
      secondPackage.addPlatform(platform);
      thirdPackage.addPlatform(platform);
      const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);
      await packageRepository.save(firstPackage);
      await packageRepository.save(secondPackage);
      await packageRepository.save(thirdPackage);
      const {
        channelRepository,
        seriesRepository, movieRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, {
        pkg: [firstPackage],
        mediaPackageId: 'vubiquity_Value_Reelz',
      });
      await createChannel(TEST_TABLE_NAME, ddbClient, {
        pkg: [secondPackage],
      });
      await createChannel(TEST_TABLE_NAME, ddbClient, {
        pkg: [firstPackage, thirdPackage],
        mediaPackageId: 'vubiquity_Value_AXS',
      });
      const geoIpRuleFactory = new GeoIpRuleFactory(uid, packageRepository);
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [firstPackage.id, secondPackage.id, thirdPackage.id],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.LOCATION,
        value: 'FR',
        weight: 2,
      });
      const secondGeoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Block Russia',
        name: 'Block RU',
        packages: [],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.LOCATION,
        value: 'RU',
        weight: 1,
      });
      const thirdGeoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Block only one package with one channel',
        name: 'Block One Package',
        packages: [thirdPackage.id],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '202.10.100.12/32',
        weight: 1,
      });
      const fourthGeoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Block only one IP globally',
        name: 'Block One IP',
        packages: [],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '202.10.100.12/32',
        weight: 1,
      });
      const firthGeoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Block only one IP globally',
        name: 'Block One IP with multiple packages',
        packages: [firstPackage.id, secondPackage.id, thirdPackage.id],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '202.10.100.12/32',
        weight: 1,
      });
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      await geoIpRuleRepository.save(secondGeoIpRule);
      await geoIpRuleRepository.save(thirdGeoIpRule);
      await geoIpRuleRepository.save(fourthGeoIpRule);
      await geoIpRuleRepository.save(firthGeoIpRule);
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();

      const firewallAdaptor = new FirewallAdaptor(
        wafClient,
        ruleBuilder,
        geoIpRuleRepository,
        channelRepository,
        originEndpointAdaptor,
        ipSetAdaptor,
        ruleGroupAdaptor,
        seriesRepository,
        movieRepository,
      );

      // Act
      const result = await firewallAdaptor.createRule(geoIpRule);

      // Assert
      expect(result).toIncludeSameMembers([
        {
          Name: 'Block One Package',
          Priority: 1,
          Statement: {
            RuleGroupReferenceStatement: {
              ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/rulegroup/GroupName/uuid',
            },
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'Block One Package',
          },
          OverrideAction: {
            None: {},
          },
        },
        {
          Name: 'Block One IP',
          Priority: 1,
          Statement: {
            IPSetReferenceStatement: {
              ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/ipset/IpSetName/uuid',
            },
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'Block One IP',
          },
          Action: {
            Block: {},
          },
        },
        {
          Name: 'Block RU',
          Priority: 1,
          Statement: {
            GeoMatchStatement: {
              CountryCodes: [
                'RU',
              ],
            },
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'Block RU',
          },
          Action: {
            Block: {},
          },
        },
        {
          Name: 'Allow FR',
          Priority: 2,
          Statement: {
            RuleGroupReferenceStatement: {
              ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/rulegroup/GroupName/uuid',
            },
          },
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'Allow FR',
          },
          OverrideAction: {
            None: {},
          },
        },
        {
          Name: 'Block One IP with multiple packages',
          OverrideAction: { None: {} },
          Priority: 1,
          Statement: { RuleGroupReferenceStatement: { ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/rulegroup/GroupName/uuid' } },
          VisibilityConfig: {
            CloudWatchMetricsEnabled: true,
            MetricName: 'Block One IP with multiple packages',
            SampledRequestsEnabled: true,
          },
        },
      ]);
    });
  });
});
