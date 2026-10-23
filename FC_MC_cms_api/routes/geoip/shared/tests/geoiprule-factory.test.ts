import { initDatabase, mockJestTimers } from '../../../../utils/jest-utils';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { GeoIpRulePolicyType, GeoIpRuleType } from '../../../shared/dto/GeoIpRuleDto';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import CIDR from '../../../shared/valueObjects/CIDR';
import GeoIpRuleFactory from '../GeoIpRuleFactory';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const dateMock = mockJestTimers();
const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-geoIpRuleFactory');

describe('GeoIpRule Factory', () => {
  describe('toDomain', () => {
    it('should create a GeoIpRule only with required members', async () => {
      // Arrange
      const id = new UIDGenerator().generate(8);
      const uid = {
        generate: () => id,
      };
      const platformFactory = new PlatformMap(new UIDGenerator());
      const platformRepository = new PlatformRepository(
        ddbClient,
        TEST_TABLE_NAME,
        platformFactory,
      );
      const packageFactory = new PackageFactory(new UIDGenerator(), platformRepository);
      const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);
      const factory = new GeoIpRuleFactory(uid, packageRepository);

      const platform = platformFactory.toDomain({ extId: 'chrome', name: 'Chrome' });
      await platformRepository.save(platform);
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
      packageItem.addPlatform(platform);
      await packageRepository.save(packageItem);

      // Act
      const geoIpRule = await factory.toDomain({
        description: 'QA Tester description',
        name: 'QA Tester',
        packages: [packageItem.id],
        weight: 0,
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '10.0.0.1/24',
      });

      // Assert
      expect(geoIpRule).toEqual({
        id,
        description: 'QA Tester description',
        extId: id,
        name: 'QA Tester',
        createdAt: dateMock,
        updatedAt: dateMock,
        packages: [packageItem],
        weight: 0,
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: new CIDR('10.0.0.1/24'),
        enabled: true,
      });
    });

    it('should create a GeoIpRule with custom extId and enabled attributes', async () => {
      // Arrange
      const id = new UIDGenerator().generate(8);
      const uid = {
        generate: () => id,
      };
      const platformFactory = new PlatformMap(new UIDGenerator());
      const platformRepository = new PlatformRepository(
        ddbClient,
        TEST_TABLE_NAME,
        platformFactory,
      );
      const packageFactory = new PackageFactory(new UIDGenerator(), platformRepository);
      const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);
      const factory = new GeoIpRuleFactory(uid, packageRepository);

      // Act
      const geoIpRule = await factory.toDomain({
        description: 'QA Tester description',
        name: 'QA Tester',
        extId: 'manual-extId',
        packages: [],
        weight: 0,
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '10.0.0.1/24',
        enabled: false,
      });

      // Assert
      expect(geoIpRule).toEqual({
        id,
        description: 'QA Tester description',
        extId: 'manual-extId',
        name: 'QA Tester',
        createdAt: dateMock,
        updatedAt: dateMock,
        packages: [],
        weight: 0,
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: new CIDR('10.0.0.1/24'),
        enabled: false,
      });
    });
  });

  describe('toPersistence', () => {
    it('should create a GeoIpRule object', async () => {
      // Arrange
      const id = new UIDGenerator().generate(8);
      const uid = {
        generate: () => id,
      };
      const platformFactory = new PlatformMap(new UIDGenerator());
      const platformRepository = new PlatformRepository(
        ddbClient,
        TEST_TABLE_NAME,
        platformFactory,
      );
      const packageFactory = new PackageFactory(new UIDGenerator(), platformRepository);
      const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);
      const factory = new GeoIpRuleFactory(uid, packageRepository);
      const geoIpRule = await factory.toDomain({
        description: 'QA Tester description',
        name: 'QA Tester',
        packages: [],
        weight: 0,
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '10.0.0.1/24',
      });

      // Act
      const persistence = factory.toPersistence(geoIpRule);

      // Assert
      expect(persistence.extId).toEqual(id);
      expect(persistence.enabled).toBeTruthy();
      expect(persistence.policyType).toEqual('BLOCK');
      expect(persistence.ruleType).toEqual('CIDR');
    });
  });
});
