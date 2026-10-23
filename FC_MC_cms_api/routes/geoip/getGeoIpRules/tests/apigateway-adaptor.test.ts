import { MediaPackageClient } from '@aws-sdk/client-mediapackage';
import {
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
import GeoIpRuleFactory from '../../shared/GeoIpRuleFactory';
import GeoIpRuleRepository from '../../shared/GeoIpRuleRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetGeoIpRulesDomain from '../GetGeoIpRulesDomain';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('testGetGeoIpRules');

describe('ApiGateway Adaptor - getGeoIpRules', () => {
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
    it('should get all rules', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const platformFactory = new PlatformMap(uid);
      const platformRepository = new PlatformRepository(
        ddbClient,
        TEST_TABLE_NAME,
        platformFactory,
      );
      const packageFactory = new PackageFactory(uid, platformRepository);
      const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);
      const geoIpRuleId = uid.generate(8);
      const geoIpRuleFactory = new GeoIpRuleFactory({
        generate: () => geoIpRuleId,
      }, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
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

      const domain = new GetGeoIpRulesDomain(geoIpRuleRepository);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      // Act
      const result = await apiGatewayAdaptor.handler(eventMock);

      // Assert
      expect(result).toEqual({
        body: JSON.stringify({
          rules: [geoIpRule],
        }),
        statusCode: 200,
      });
    });

    it('should get all rules with pagination', async () => {
      // Arrange
      const uid = new UIDGenerator();
      const platformFactory = new PlatformMap(uid);
      const platformRepository = new PlatformRepository(
        ddbClient,
        TEST_TABLE_NAME,
        platformFactory,
      );
      const packageFactory = new PackageFactory(uid, platformRepository);
      const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);
      const geoIpRuleId = uid.generate(8);
      const geoIpRuleFactory = new GeoIpRuleFactory({
        generate: () => geoIpRuleId,
      }, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const firstGeoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Allow France users',
        name: 'Allow FR',
        packages: [],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.LOCATION,
        value: 'FR',
        weight: 0,
      });
      const secondGeoIpRule = await geoIpRuleFactory.toDomain({
        description: 'Block RU users',
        name: 'Block RU',
        packages: [],
        policyType: GeoIpRulePolicyType.ALLOW,
        ruleType: GeoIpRuleType.LOCATION,
        value: 'RU',
        weight: 1,
      });
      await geoIpRuleRepository.save(firstGeoIpRule);
      await geoIpRuleRepository.save(secondGeoIpRule);

      const domain = new GetGeoIpRulesDomain(geoIpRuleRepository);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
      const nextToken = {
        SK: `ASSET#GEO_IP_RULE#${geoIpRuleId}`, 'GSI5-PK': 'ASSET#GEO_IP_RULE', PK: `ASSET#GEO_IP_RULE#${geoIpRuleId}`, 'GSI5-SK': 1,
      };

      // Act
      const result = await apiGatewayAdaptor.handler({
        ...eventMock,
        queryStringParameters: {
          limit: '1',
        },
      });

      // Assert
      expect(result).toEqual({
        body: JSON.stringify({
          rules: [secondGeoIpRule],
          nextToken: Buffer.from(JSON.stringify(nextToken)).toString('base64'),
        }),
        statusCode: 200,
      });
    });
  });
});
