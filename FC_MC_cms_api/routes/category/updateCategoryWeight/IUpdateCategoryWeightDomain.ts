export interface IUpdateCategoryWeightDomain {
  updateCategoryWeight(id: string, index: string): Promise<boolean>
}
