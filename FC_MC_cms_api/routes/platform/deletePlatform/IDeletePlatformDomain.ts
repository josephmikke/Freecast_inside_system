export interface IDeletePlatformDomain {
  deletePlatform(id: string): Promise<boolean>
}
