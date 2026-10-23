import { initDatabase } from '../../../../utils/jest-utils';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { GeoIpRulePolicyType, GeoIpRuleType } from '../../../shared/dto/GeoIpRuleDto';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import { IFactory } from '../../../shared/interfaces/IFactory';
import GeoIpRule from '../GeoIpRule';
import GeoIpRuleFactory from '../GeoIpRuleFactory';
import GeoIpRuleRepository, { GeoIpRuleDocument } from '../GeoIpRuleRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { IGeoIpRuleRepository } from '../IGeoIpRuleRepository';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-geoIpRuleRepository');

describe('GeoIpRule repository', () => {
  let fakeRepository: IGeoIpRuleRepository;
  let fakeFactory: IFactory<any, any, any>;

  describe('save', () => {
    it('should save a new GeoIpRule and be truthy', async () => {
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
      const factory = new GeoIpRuleFactory(uid, packageRepository);
      const repository = new GeoIpRuleRepository(ddbClient, TEST_TABLE_NAME, factory);
      const geoIpRule = await factory.toDomain({
        description: 'Rule description',
        enabled: false,
        name: 'Block all',
        packages: [],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '202.0.2.1/24',
        weight: 0,
      });

      // Act
      const result = await repository.save(geoIpRule);
      // @ts-ignore
      const { Items: [Item] }: { Items: GeoIpRuleDocument[] } = await repository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
          ':SK': 'ASSET#',
        },
      });

      // Assert
      expect(result).toBeTruthy();
      expect(Item.id).toEqual(geoIpRule.id);
      expect(Item.PK).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`);
      expect(Item.SK).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`);
      expect(Item['GSI1-PK']).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}`);
      expect(Item['GSI1-SK']).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`);
      expect(Item['GSI5-PK']).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}`);
      expect(Item['GSI5-SK']).toEqual(geoIpRule.weight);
      expect(Item.entityType).toEqual(GeoIpRuleRepository.RootEntityType);
    });

    it('should save a new GeoIpRule with Platforms and be truthy', async () => {
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
      const factory = new GeoIpRuleFactory(uid, packageRepository);
      const repository = new GeoIpRuleRepository(ddbClient, TEST_TABLE_NAME, factory);
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
      const geoIpRule = await factory.toDomain({
        description: 'Rule description',
        enabled: false,
        name: 'Block all',
        packages: [packageItem.id],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '202.0.2.1/24',
        weight: 0,
      });

      // Act
      const result = await repository.save(geoIpRule);
      // @ts-ignore
      const { Items }: { Items: GeoIpRuleDocument[] } = await repository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
          ':SK': 'ASSET#',
        },
      });
      const [geoIpDocument, pkgDocument] = Items;

      // Assert
      expect(result).toBeTruthy();
      expect(Items).toHaveLength(2);
      expect(geoIpDocument.id).toEqual(geoIpRule.id);
      expect(geoIpDocument.PK).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`);
      expect(geoIpDocument.SK).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`);
      expect(geoIpDocument['GSI1-PK']).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}`);
      expect(geoIpDocument['GSI1-SK']).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`);
      expect(geoIpDocument['GSI5-PK']).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}`);
      expect(geoIpDocument['GSI5-SK']).toEqual(geoIpRule.weight);
      expect(geoIpDocument.entityType).toEqual(GeoIpRuleRepository.RootEntityType);
      expect(pkgDocument.PK).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`);
      expect(pkgDocument.SK).toEqual(`ASSET#${GeoIpRuleRepository.ChildEntityType}#${packageItem.id}`);
      expect(pkgDocument['GSI1-PK']).toEqual(`ASSET#${GeoIpRuleRepository.ChildEntityType}#${packageItem.id}`);
      expect(pkgDocument['GSI1-SK']).toEqual(`ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`);
      expect(pkgDocument.entityType).toEqual(GeoIpRuleRepository.RootEntityType);
      expect(pkgDocument.id).toEqual(packageItem.id);
    });
  });

  describe('remove', () => {
    it('should remove an existing GeoIpRule', async () => {
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
      const factory = new GeoIpRuleFactory(uid, packageRepository);
      const repository = new GeoIpRuleRepository(ddbClient, TEST_TABLE_NAME, factory);
      const geoIpRule = await factory.toDomain({
        description: 'Rule description',
        enabled: false,
        name: 'Block all',
        packages: [],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '202.0.2.1/24',
        weight: 0,
      });
      await repository.save(geoIpRule);

      // Act
      // @ts-ignore
      const { Items: beforeDeletion }: { Items: GeoIpRuleDocument[] } = await repository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
          ':SK': 'ASSET#',
        },
      });
      const deletion = await repository.remove(geoIpRule);
      // @ts-ignore
      const { Items: afterDeletion }: { Items: GeoIpRuleDocument[] } = await repository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
          ':SK': 'ASSET#',
        },
      });

      // Assert
      expect(beforeDeletion).toHaveLength(1);
      expect(beforeDeletion[0]).not.toBeUndefined();
      expect(deletion).toBeTruthy();
      expect(afterDeletion).toHaveLength(0);
    });

    it('should remove an existing GeoIpRule with packages', async () => {
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
      const factory = new GeoIpRuleFactory(uid, packageRepository);
      const repository = new GeoIpRuleRepository(ddbClient, TEST_TABLE_NAME, factory);
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
      const geoIpRule = await factory.toDomain({
        description: 'Rule description',
        enabled: false,
        name: 'Block all',
        packages: [packageItem.id],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '202.0.2.1/24',
        weight: 0,
      });
      await repository.save(geoIpRule);

      // Act
      // @ts-ignore
      const { Items: beforeDeletion }: { Items: GeoIpRuleDocument[] } = await repository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
          ':SK': 'ASSET#',
        },
      });
      const deletion = await repository.remove(geoIpRule);
      // @ts-ignore
      const { Items: afterDeletion }: { Items: GeoIpRuleDocument[] } = await repository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
          ':SK': 'ASSET#',
        },
      });

      // Assert
      expect(beforeDeletion).toHaveLength(2);
      expect(beforeDeletion[0]).not.toBeUndefined();
      expect(deletion).toBeTruthy();
      expect(afterDeletion).toHaveLength(0);
    });
  });

  describe('find', () => {
    it('should find one GeoIpRule including packages', async () => {
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
      const factory = new GeoIpRuleFactory(uid, packageRepository);
      const repository = new GeoIpRuleRepository(ddbClient, TEST_TABLE_NAME, factory);
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
      const geoIpRule = await factory.toDomain({
        description: 'Rule description',
        enabled: false,
        name: 'Block all',
        packages: [packageItem.id],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '202.0.2.1/24',
        weight: 0,
      });
      await repository.save(geoIpRule);

      // Act
      const result = await repository.findOne(geoIpRule.id);

      // Assert
      expect(result).not.toBeUndefined();
      expect(result?.packages).toHaveLength(1);
      expect(result?.packages[0]).toEqual(packageItem);
    });

    it('should try to find one GeoIpRule and return undefined', async () => {
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
      const factory = new GeoIpRuleFactory(uid, packageRepository);
      const repository = new GeoIpRuleRepository(ddbClient, TEST_TABLE_NAME, factory);
      const geoIpRule = await factory.toDomain({
        description: 'Rule description',
        enabled: false,
        name: 'Block all',
        packages: [],
        policyType: GeoIpRulePolicyType.BLOCK,
        ruleType: GeoIpRuleType.CIDR,
        value: '202.0.2.1/24',
        weight: 0,
      });

      // Act
      const result = await repository.findOne(geoIpRule.id);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should find all GeoIpRules sorted by weight', async () => {
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
      const factory = new GeoIpRuleFactory(uid, packageRepository);
      const repository = new GeoIpRuleRepository(ddbClient, TEST_TABLE_NAME, factory);
      const geoIpRules = await Promise.all(Array.from(Array(2).keys()).map(async (key) => {
        const geoIpRule = await factory.toDomain({
          description: `Rule description ${key}`,
          enabled: false,
          name: `Block all ${key}`,
          packages: [],
          policyType: GeoIpRulePolicyType.BLOCK,
          ruleType: GeoIpRuleType.CIDR,
          value: '202.0.2.1/24',
          weight: key,
        });
        await repository.save(geoIpRule);
        return geoIpRule;
      }));

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual({ nextToken: undefined, rules: geoIpRules });
    });

    it('should find all GeoIpRules sorted by weight with pagination', async () => {
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
      const factory = new GeoIpRuleFactory(uid, packageRepository);
      const repository = new GeoIpRuleRepository(ddbClient, TEST_TABLE_NAME, factory);
      const [firstRule, secondRule, thirdRule, fourthRule] = await Promise.all(Array
        .from(Array(4).keys()).map(async (key) => {
          const geoIpRule = await factory.toDomain({
            description: `Rule description ${key}`,
            enabled: false,
            name: `Block all ${key}`,
            packages: [],
            policyType: GeoIpRulePolicyType.BLOCK,
            ruleType: GeoIpRuleType.CIDR,
            value: '202.0.2.1/24',
            weight: key,
            id: key.toString(),
          });
          await repository.save(geoIpRule);
          return geoIpRule;
        }));

      // Act
      let result = await repository.findAll({ limit: 2 });

      // Assert
      const token = {
        SK: 'ASSET#GEO_IP_RULE#1', 'GSI5-PK': 'ASSET#GEO_IP_RULE', PK: 'ASSET#GEO_IP_RULE#1', 'GSI5-SK': 1,
      };
      expect(result.nextToken).toEqual(Buffer.from(JSON.stringify(token)).toString('base64'));
      expect(result.rules).toEqual([firstRule, secondRule]);
      result = await repository.findAll({
        limit: 2,
        nextToken: result.nextToken,
      });
      expect(result.rules).toEqual([thirdRule, fourthRule]);
      result = await repository.findAll({
        limit: 2,
        nextToken: result.nextToken,
      });
      expect(result).toEqual({ nextToken: undefined, rules: [] });
    });

    it('should try to find all GeoIpRules and return an empty array', async () => {
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
      const factory = new GeoIpRuleFactory(uid, packageRepository);
      const repository = new GeoIpRuleRepository(ddbClient, TEST_TABLE_NAME, factory);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual({ nextToken: undefined, rules: [] });
    });
  });

  describe.each([
    (payload: GeoIpRule) => fakeRepository.remove(payload),
    (payload: GeoIpRule) => fakeRepository.save(payload),
    (id: string) => fakeRepository.findOne(id),
    () => fakeRepository.findAll(),
  ])('Exceptions', (func) => {
    // Don't create table to force Exception
    beforeAll(() => {
      fakeRepository = new GeoIpRuleRepository(ddbClient, 'fake-table', fakeFactory);
    });

    it(`${func} should throw an error`, async () => {
      // @ts-ignore
      await expect(async () => func()).rejects.toThrow();
    });
  });
});
