export interface IDeleteLocationDomain {
  deleteLocation(id: string): Promise<boolean>
}
