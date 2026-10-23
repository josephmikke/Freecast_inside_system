export interface IDeletePackageDomain {
  deletePackage(id: string): Promise<boolean>
}
