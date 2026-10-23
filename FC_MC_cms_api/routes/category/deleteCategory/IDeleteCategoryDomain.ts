export interface IDeleteCategoryDomain {
  deleteCategory(id: string): Promise<boolean>
}
