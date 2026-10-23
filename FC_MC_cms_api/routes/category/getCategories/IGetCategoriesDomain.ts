import Category from '../shared/Category';

export interface IGetCategoriesDomain {
  getCategories(): Promise<Category[]>
}
