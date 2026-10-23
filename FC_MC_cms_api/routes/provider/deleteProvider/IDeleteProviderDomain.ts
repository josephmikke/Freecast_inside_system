export interface IDeleteProviderDomain {
  deleteProvider(id: string): Promise<boolean>
}
