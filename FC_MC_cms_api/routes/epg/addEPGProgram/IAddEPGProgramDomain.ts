import { EPGProgram, EPGProgramRequest } from '../shared/IParser';

export interface IAddEPGProgramDomain {
  addNewEPGProgram(epgId: string, program: EPGProgramRequest): Promise<EPGProgram>
}
