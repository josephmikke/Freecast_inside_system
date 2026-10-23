export interface IUpdatePackageWeightDomain {
  updatePackageWeight(id: string, index: string): Promise<boolean>
}
