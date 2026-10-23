export interface IUpdateGeoIpRuleEnabledDomain {
  updateGeoIpRuleEnabled(id: string, enabled: boolean): Promise<boolean>
}
