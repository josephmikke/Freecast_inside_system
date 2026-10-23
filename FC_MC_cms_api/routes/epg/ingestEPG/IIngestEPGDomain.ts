export interface IIngestEPGDomain {
  ingestEPG(id: string): Promise<void>
}
