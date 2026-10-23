import { CategoryRequestDto } from '../../shared/dto/CategoryDto';

export interface IUpdateCategoryDomain {
  updateCategory(id: string, props: Partial<CategoryRequestDto>): Promise<boolean>
}
