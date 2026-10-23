import { EPGProgram } from '../shared/IParser';

export interface IUpdateEPGProgramDomain {
  updateEPGProgram(epgId: string, id: string, program: Partial<EPGProgram>): Promise<boolean>
}
