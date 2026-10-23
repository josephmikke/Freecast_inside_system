import { DescribeOriginEndpointCommand, MediaPackageClient } from '@aws-sdk/client-mediapackage';
import {
  CreateIPSetCommand,
  CreateRuleGroupCommand,
  GetWebACLCommand,
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
import AddGeoIpRuleDomain from '../AddGeoIpRuleDomain';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-addGeoIpRule');

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}
const logTracker = new MockLogTracker();

describe('ApiGateway Adaptor - addGeoIpRule', () => {
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
    it('should add a new GeoIpRule', async () => {
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
      } = await createChannel(TEST_TABLE_NAME, ddbClient, {
        pkg: [packageItem],
      });

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

      const domain = new AddGeoIpRuleDomain(geoIpRuleFactory, firewallAdaptor, geoIpRuleRepository, logTracker);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act

      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        body: {
          name: 'QA Tester',
          description: 'Allow IP 32.255.455.12',
          packages: [],
          policyType: GeoIpRulePolicyType.ALLOW,
          ruleType: GeoIpRuleType.CIDR,
          value: '32.255.455.12',
        },
      });

      // Assert
      expect(result).toEqual({
        body: '',
        statusCode: 201,
        headers: {
          Location: `/rules/${geoIpRuleId}`,
        },
      });
    });
  });
});
