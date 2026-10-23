export interface IUpdateGeoIpRuleWeightDomain {
  updateGeoIpRuleWeight(id: string, index: string): Promise<boolean>
}
