export interface IRepairEPGDomain {
  repairEPG(epgId: string): Promise<void>
}
