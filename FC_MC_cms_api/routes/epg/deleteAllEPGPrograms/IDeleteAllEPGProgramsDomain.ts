export interface IDeleteAllEPGProgramsDomain {
  deleteAllEPGProgram(epgId: string): Promise<void>
}