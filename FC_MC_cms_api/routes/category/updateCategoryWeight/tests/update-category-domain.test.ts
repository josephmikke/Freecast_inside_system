import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { initDatabase, mockJestTimers } from '../../../../utils/jest-utils';
import Category from '../../shared/Category';
import CategoryMap from '../../shared/CategoryMap';
import CategoryRepository from '../../shared/CategoryRepository';
import UpdateCategoryWeightDomain from '../UpdateCategoryWeightDomain';
import { CategoryError } from '../../shared/CategoryError';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-updateCategoryWeightDomain');
mockJestTimers();
const uid = new UIDGenerator();
const categoryMap = new CategoryMap(uid);
const categoryRepository = new CategoryRepository(
  ddbClient,
  TEST_TABLE_NAME,
  categoryMap,
);
const domain = new UpdateCategoryWeightDomain(categoryRepository, categoryMap);

describe('UpdateCategoryWeightDomain', () => {
  describe('updateCategory', () => {
    it('should change the weight of all categories', async () => {
      // Arrange
      const categories = Array.from(Array(5).keys()).map((key) => Category.create({
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        enabled: false,
        extId: `category-${key}`,
        name: `category-${key}`,
        weight: key,
      }, key.toString()));

      await Promise.all(categories.map(async (category) => {
        await categoryRepository.save(category);
      }));

      // Act
      const shouldBeTruthy = await domain.updateCategoryWeight('2', '5');
      const updatedCategories = await categoryRepository.findAll();

      // Assert
      expect(shouldBeTruthy).toBeTruthy();
      expect(updatedCategories[4]).toEqual({
        id: '2',
        extId: 'category-2',
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        enabled: false,
        name: 'category-2',
        weight: 4,
      });
    });

    it('should throw CategoryNotFound exception', async () => {
      // Arrange
      const categories = Array.from(Array(5).keys()).map((key) => Category.create({
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        enabled: false,
        extId: `category-${key}`,
        name: `category-${key}`,
        weight: key,
      }, key.toString()));
      await Promise.all(categories.map(async (category) => {
        await categoryRepository.save(category);
      }));

      // Act & Assert
      await expect(async () => domain.updateCategoryWeight('random', '5')).rejects.toThrow(CategoryError.CategoryNotFound);
    });
  });
});
