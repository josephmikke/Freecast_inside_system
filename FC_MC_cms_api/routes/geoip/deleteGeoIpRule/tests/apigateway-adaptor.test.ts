import { DescribeOriginEndpointCommand, MediaPackageClient } from '@aws-sdk/client-mediapackage';
import {
  CreateIPSetCommand,
  CreateRuleGroupCommand, DeleteIPSetCommand, DeleteRuleGroupCommand, GetRuleGroupCommand,
  GetWebACLCommand, ListIPSetsCommand, ListRuleGroupsCommand,
  UpdateWebACLCommand,
  WAFV2Client,
} from '@aws-sdk/client-wafv2';
import { mockClient } from 'aws-sdk-client-mock';

import { initDatabase } from '../../../../utils/jest-utils';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { GeoIpRulePolicyType, GeoIpRuleType } from '../../../shared/dto/GeoIpRuleDto';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import FirewallAdaptor from '../../shared/FirewallAdaptor';
import GeoIpRuleFactory from '../../shared/GeoIpRuleFactory';
import GeoIpRuleRepository from '../../shared/GeoIpRuleRepository';
import IPSetAdaptor from '../../shared/IPSetAdaptor';
import OriginEndpoint from '../../shared/OriginEndpoint';
import RuleBuilder from '../../shared/RuleBuilder';
import RuleGroupAdaptor from '../../shared/RuleGroupAdaptor';
import eventMock from '../../shared/tests/event-mock';
import createChannel from '../../shared/tests/GeoIpRuleHelper';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeleteGeoIpRuleDomain from '../DeleteGeoIpRuleDomain';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('testDeleteGeoIpRule');

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}
const logTracker = new MockLogTracker();

describe('ApiGateway Adaptor - deleteGeoIpRule', () => {
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
    };
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  describe('Success case', () => {
    it('should delete a GeoIp rule and recreate the ACL', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});

      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
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
        channelRepository,
        movieRepository, seriesRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, { pkg: [packageItem] });

      const geoIpRuleId = uid.generate(8);
      const geoIpRuleFactory = new GeoIpRuleFactory({
        generate: () => geoIpRuleId,
      }, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.LOCATION,
        value: 'FR',
        weight: 0,
      });
      await geoIpRuleRepository.save(geoIpRule);
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

      const domain = new DeleteGeoIpRuleDomain(
        firewallAdaptor,
        geoIpRuleRepository,
        ipSetAdaptor,
        ruleGroupAdaptor,
        logTracker,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act
      const beforeDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);
      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        pathParameters: {
          id: geoIpRule.id,
        },
      });
      const afterDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);

      // Assert
      expect(beforeDeletion).toBeDefined();
      expect(afterDeletion).toBeUndefined();
      expect(result).toEqual({
        body: '',
        statusCode: 204,
      });
    });
    it('should delete a GeoIp rule and recreate the ACL with other rules', async () => {
    // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});

      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
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
        channelRepository,
        movieRepository,
        seriesRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, { pkg: [packageItem] });

      const geoIpRuleFactory = new GeoIpRuleFactory(uid, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.LOCATION,
        value: 'FR',
        weight: 0,
      });
      const secondGeoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Block RU',
        name: 'Block RU',
        packages: [],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.LOCATION,
        value: 'RU',
        weight: 0,
      });
      await geoIpRuleRepository.save(geoIpRule);
      await geoIpRuleRepository.save(secondGeoIpRule);
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

      const domain = new DeleteGeoIpRuleDomain(
        firewallAdaptor,
        geoIpRuleRepository,
        ipSetAdaptor,
        ruleGroupAdaptor,
        logTracker,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act
      const beforeDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);
      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        pathParameters: {
          id: geoIpRule.id,
        },
      });
      const afterDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);
      const shouldExists = await geoIpRuleRepository.findOne(secondGeoIpRule.id);

      // Assert
      expect(beforeDeletion).toBeDefined();
      expect(afterDeletion).toBeUndefined();
      expect(shouldExists).toBeDefined();
      expect(result).toEqual({
        body: '',
        statusCode: 204,
      });
    });
  });

  describe('Error case', () => {
    it('should try to delete a GeoIp rule and throw a 404 error', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});

      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
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
        channelRepository,
        movieRepository,
        seriesRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, { pkg: [packageItem] });

      const geoIpRuleId = uid.generate(8);
      const geoIpRuleFactory = new GeoIpRuleFactory({
        generate: () => geoIpRuleId,
      }, packageRepository);
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

      const domain = new DeleteGeoIpRuleDomain(
        firewallAdaptor,
        geoIpRuleRepository,
        ipSetAdaptor,
        ruleGroupAdaptor,
        logTracker,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act
      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        pathParameters: {
          id: 'invalid-id',
        },
      });

      // Assert
      expect(result).toEqual({
        body: '{"error":"Rule Not Found"}',
        statusCode: 404,
      });
    });

    it('should throw an IPSets Not Found', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});

      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
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

      wafMock.on(ListIPSetsCommand).resolves({
        IPSets: undefined,
      });

      const originEndpointAdaptor = new OriginEndpoint(mpClient);

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
        channelRepository,
        movieRepository,
        seriesRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, { pkg: [packageItem] });

      const geoIpRuleId = uid.generate(8);
      const geoIpRuleFactory = new GeoIpRuleFactory({
        generate: () => geoIpRuleId,
      }, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.CIDR,
        value: '10.10.10.10/32',
        weight: 0,
      });
      await geoIpRuleRepository.save(geoIpRule);
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

      const domain = new DeleteGeoIpRuleDomain(
        firewallAdaptor,
        geoIpRuleRepository,
        ipSetAdaptor,
        ruleGroupAdaptor,
        logTracker,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act
      const beforeDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);
      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        pathParameters: {
          id: geoIpRule.id,
        },
      });
      const afterDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);

      // Assert
      expect(beforeDeletion).toBeDefined();
      expect(afterDeletion).toBeUndefined();
      expect(result).toEqual({
        body: '{"error":"IPSets Not Found"}',
        statusCode: 404,
      });
    });

    it('should throw an IPSet Not Found', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});

      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
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

      wafMock.on(ListIPSetsCommand).resolves({
        IPSets: [],
      });

      const originEndpointAdaptor = new OriginEndpoint(mpClient);

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
        channelRepository,
        movieRepository,
        seriesRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, { pkg: [packageItem] });

      const geoIpRuleId = uid.generate(8);
      const geoIpRuleFactory = new GeoIpRuleFactory({
        generate: () => geoIpRuleId,
      }, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.CIDR,
        value: '10.10.10.10/32',
        weight: 0,
      });
      await geoIpRuleRepository.save(geoIpRule);
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

      const domain = new DeleteGeoIpRuleDomain(
        firewallAdaptor,
        geoIpRuleRepository,
        ipSetAdaptor,
        ruleGroupAdaptor,
        logTracker,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act
      const beforeDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);
      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        pathParameters: {
          id: geoIpRule.id,
        },
      });
      const afterDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);

      // Assert
      expect(beforeDeletion).toBeDefined();
      expect(afterDeletion).toBeUndefined();
      expect(result).toEqual({
        body: '{"error":"IPSet Not Found"}',
        statusCode: 404,
      });
    });

    it('should throw UnableToDeleteIPSet', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});

      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
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

      wafMock.on(DeleteIPSetCommand).rejects({});
      wafMock.on(ListIPSetsCommand).resolves({
        IPSets: [{
          Name: 'Allow FR',
          LockToken: 'token',
          Id: 'token',
        }],
      });
      wafMock.on(DeleteIPSetCommand).rejects({});

      const originEndpointAdaptor = new OriginEndpoint(mpClient);

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
        channelRepository,
        movieRepository,
        seriesRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, { pkg: [packageItem] });

      const geoIpRuleId = uid.generate(8);
      const geoIpRuleFactory = new GeoIpRuleFactory({
        generate: () => geoIpRuleId,
      }, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.CIDR,
        value: '10.10.10.10/32',
        weight: 0,
      });
      await geoIpRuleRepository.save(geoIpRule);
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

      const domain = new DeleteGeoIpRuleDomain(
        firewallAdaptor,
        geoIpRuleRepository,
        ipSetAdaptor,
        ruleGroupAdaptor,
        logTracker,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act
      const beforeDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);
      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        pathParameters: {
          id: geoIpRule.id,
        },
      });
      const afterDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);

      // Assert
      expect(beforeDeletion).toBeDefined();
      expect(afterDeletion).toBeUndefined();
      expect(result).toEqual({
        body: '{"error":"Unable to delete IPSet Error: Error"}',
        statusCode: 500,
      });
    });

    it('should throw Rule Groups Not Found', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});

      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
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
      wafMock.on(ListIPSetsCommand).resolves({
        IPSets: [{
          Name: 'Allow FR',
          LockToken: 'token',
          Id: 'token',
        }],
      });
      wafMock.on(DeleteIPSetCommand).resolves({});
      wafMock.on(ListRuleGroupsCommand).resolves({
        RuleGroups: undefined,
      });

      const originEndpointAdaptor = new OriginEndpoint(mpClient);

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
        channelRepository,
        movieRepository,
        seriesRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, { pkg: [packageItem] });

      const geoIpRuleId = uid.generate(8);
      const geoIpRuleFactory = new GeoIpRuleFactory({
        generate: () => geoIpRuleId,
      }, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [packageItem.id],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.CIDR,
        value: '10.10.10.10/32',
        weight: 0,
      });
      await geoIpRuleRepository.save(geoIpRule);
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

      const domain = new DeleteGeoIpRuleDomain(
        firewallAdaptor,
        geoIpRuleRepository,
        ipSetAdaptor,
        ruleGroupAdaptor,
        logTracker,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act
      const beforeDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);
      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        pathParameters: {
          id: geoIpRule.id,
        },
      });
      const afterDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);

      // Assert
      expect(beforeDeletion).toBeDefined();
      expect(afterDeletion).toBeUndefined();
      expect(result).toEqual({
        body: '{"error":"Rule Groups Not Found"}',
        statusCode: 404,
      });
    });

    it('should throw Rule Groups Not Found', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});

      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
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
      wafMock.on(ListIPSetsCommand).resolves({
        IPSets: [{
          Name: 'Allow FR',
          LockToken: 'token',
          Id: 'token',
        }],
      });
      wafMock.on(DeleteIPSetCommand).resolves({});
      wafMock.on(ListRuleGroupsCommand).resolves({
        RuleGroups: [],
      });

      const originEndpointAdaptor = new OriginEndpoint(mpClient);

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
        channelRepository,
        movieRepository,
        seriesRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, { pkg: [packageItem] });

      const geoIpRuleId = uid.generate(8);
      const geoIpRuleFactory = new GeoIpRuleFactory({
        generate: () => geoIpRuleId,
      }, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [packageItem.id],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.CIDR,
        value: '10.10.10.10/32',
        weight: 0,
      });
      await geoIpRuleRepository.save(geoIpRule);
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

      const domain = new DeleteGeoIpRuleDomain(
        firewallAdaptor,
        geoIpRuleRepository,
        ipSetAdaptor,
        ruleGroupAdaptor,
        logTracker,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act
      const beforeDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);
      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        pathParameters: {
          id: geoIpRule.id,
        },
      });
      const afterDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);

      // Assert
      expect(beforeDeletion).toBeDefined();
      expect(afterDeletion).toBeUndefined();
      expect(result).toEqual({
        body: '{"error":"Rule Group Not Found"}',
        statusCode: 404,
      });
    });

    it('should throw UnableToDeleteRuleGroup', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});

      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
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
      wafMock.on(ListIPSetsCommand).resolves({
        IPSets: [{
          Name: 'Allow FR',
          LockToken: 'token',
          Id: 'token',
        }],
      });
      wafMock.on(DeleteIPSetCommand).resolves({});
      wafMock.on(ListRuleGroupsCommand).resolves({
        RuleGroups: [{
          Name: 'Allow FR',
          LockToken: 'token',
          Id: 'token',
        }],
      });
      wafMock.on(GetRuleGroupCommand).resolves({
        RuleGroup: {
          ARN: 'Something',
          Name: 'Allow FR',
          Id: 'token',
          Rules: [],
          Description: '',
          Capacity: 10,
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: 'STRING_VALUE',
          },
        },
        LockToken: '',

      });
      wafMock.on(DeleteRuleGroupCommand).rejects({});

      const originEndpointAdaptor = new OriginEndpoint(mpClient);

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
        channelRepository,
        movieRepository,
        seriesRepository,
      } = await createChannel(TEST_TABLE_NAME, ddbClient, { pkg: [packageItem] });

      const geoIpRuleId = uid.generate(8);
      const geoIpRuleFactory = new GeoIpRuleFactory({
        generate: () => geoIpRuleId,
      }, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const geoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [packageItem.id],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.CIDR,
        value: '10.10.10.10/32',
        weight: 0,
      });
      await geoIpRuleRepository.save(geoIpRule);
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

      const domain = new DeleteGeoIpRuleDomain(
        firewallAdaptor,
        geoIpRuleRepository,
        ipSetAdaptor,
        ruleGroupAdaptor,
        logTracker,
      );
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act
      const beforeDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);
      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        pathParameters: {
          id: geoIpRule.id,
        },
      });
      const afterDeletion = await geoIpRuleRepository.findOne(geoIpRule.id);

      // Assert
      expect(beforeDeletion).toBeDefined();
      expect(afterDeletion).toBeUndefined();
      expect(result).toEqual({
        body: '{"error":"Unable to delete Rule Group Error: Error"}',
        statusCode: 500,
      });
    });
  });
});
