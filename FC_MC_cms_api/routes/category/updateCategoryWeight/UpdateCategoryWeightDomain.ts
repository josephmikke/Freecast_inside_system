import { CategoryDto, CategoryRequestDto } from '../../shared/dto/CategoryDto';
import { IMapper } from '../../shared/interfaces/IMapper';
import Category from '../shared/Category';
import { CategoryError } from '../shared/CategoryError';
import { ICategoryRepository } from '../shared/ICategoryRepository';

import { IUpdateCategoryWeightDomain } from './IUpdateCategoryWeightDomain';

export default class UpdateCategoryWeightDomain implements IUpdateCategoryWeightDomain {
  private readonly repository: ICategoryRepository;

  private readonly categoryMap: IMapper<Category, CategoryRequestDto, CategoryDto>;

  private static NOT_FOUND = 0;

  constructor(
    repository: ICategoryRepository,
    categoryMap: IMapper<Category, CategoryRequestDto, CategoryDto>,
  ) {
    this.repository = repository;
    this.categoryMap = categoryMap;
  }

  private changePosition(categories: Array<Category>, initialIndex: number, newIndex: number) {
    const [element] = categories.splice(initialIndex, 1);
    categories.splice(newIndex, 0, element);
    return categories.map((category, key) => {
      category.updateWeight(key);
      return category;
    });
  }

  async updateCategoryWeight(id: string, index: string): Promise<boolean> {
    const categories = await this.repository.findAll();
    const initialIndex = categories.findIndex((category) => category.id === id);
    if (initialIndex < UpdateCategoryWeightDomain.NOT_FOUND) {
      throw new CategoryError.CategoryNotFound();
    }
    const newArr = this.changePosition(categories, initialIndex, parseInt(index, 10));
    return this.repository.updateWeight(newArr);
  }
}
