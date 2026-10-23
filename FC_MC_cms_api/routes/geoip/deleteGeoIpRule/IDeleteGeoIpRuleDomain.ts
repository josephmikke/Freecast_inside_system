export interface IDeleteGeoIpRuleDomain {
  deleteGeoIpRule(id: string): Promise<boolean>
}
