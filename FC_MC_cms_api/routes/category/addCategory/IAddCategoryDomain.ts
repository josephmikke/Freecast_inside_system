import { CategoryRequestDto } from '../../shared/dto/CategoryDto';
import Category from '../shared/Category';

export interface IAddCategoryDomain {
  addNewCategory(category: CategoryRequestDto): Promise<Category>
}
