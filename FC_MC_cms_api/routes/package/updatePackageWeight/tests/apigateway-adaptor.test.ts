import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { initDatabase, mockJestTimers } from '../../../../utils/jest-utils';
import Package from '../../shared/Package';
import PackageFactory from '../../shared/PackageFactory';
import PackageRepository from '../../shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import UpdatePackageWeightDomain from '../UpdatePackageWeightDomain';
import { PackageError } from '../../shared/PackageError';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import Thumbnail from '../../../shared/valueObjects/Thumbnail';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-updatePackageWeightDomain');
mockJestTimers();
const uid = new UIDGenerator();
const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TEST_TABLE_NAME, platformMap);
const packageMap = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(
  ddbClient,
  TEST_TABLE_NAME,
  packageMap,
);
const domain = new UpdatePackageWeightDomain(packageRepository, packageMap);

describe('UpdatePackageWeightDomain', () => {
  describe('updatePackage', () => {
    it('should change the weight of all packages', async () => {
      // Arrange
      const packages = Array.from(Array(5).keys()).map((key) => Package.create({
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        enabled: false,
        extId: `package-${key}`,
        name: `package-${key}`,
        description: 'Description',
        price: '$1',
        type: PackageType.INTERNAL,
        revenueModel: RevenueModel.PAID,
        default: true,
        thumbnail: 'packages/packageid/thumbnail.png',
        weight: key,
      }, key.toString()));

      await Promise.all(packages.map(async (packageItem) => {
        await packageRepository.save(packageItem);
      }));

      // Act
      const shouldBeTruthy = await domain.updatePackageWeight('2', '5');
      const updatedCategories = await packageRepository.findAll();

      // Assert
      expect(shouldBeTruthy).toBeTruthy();
      expect(updatedCategories[4]).toEqual({
        id: '2',
        extId: 'package-2',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: false,
        name: 'package-2',
        description: 'Description',
        price: '$1',
        type: PackageType.INTERNAL,
        revenueModel: RevenueModel.PAID,
        default: true,
        platforms: [],
        thumbnail: new Thumbnail('packages/packageid/thumbnail.png'),
        weight: 4,
      });
    });

    it('should throw PackageNotFound exception', async () => {
      // Arrange
      const packages = Array.from(Array(5).keys()).map((key) => Package.create({
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        enabled: false,
        extId: `package-${key}`,
        name: `package-${key}`,
        description: 'Description',
        price: '$1',
        type: PackageType.INTERNAL,
        revenueModel: RevenueModel.PAID,
        default: true,
        thumbnail: 'packages/packageid/thumbnail.png',
        weight: key,
      }, key.toString()));
      await Promise.all(packages.map(async (packageItem) => {
        await packageRepository.save(packageItem);
      }));

      // Act & Assert
      await expect(async () => domain.updatePackageWeight('random', '5')).rejects.toThrow(PackageError.PackageNotFound);
    });
  });
});
