import Category from '../shared/Category';
import { ICategoryRepository } from '../shared/ICategoryRepository';

import { IGetCategoriesDomain } from './IGetCategoriesDomain';

export default class GetCategoriesDomain implements IGetCategoriesDomain {
  private readonly repository: ICategoryRepository;

  constructor(repository: ICategoryRepository) {
    this.repository = repository;
  }

  async getCategories(): Promise<Category[]> {
    return this.repository.findAll();
  }
}
