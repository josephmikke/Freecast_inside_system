import { EPGProgramsParameters } from '../../shared/dto/EPGDto';

import EPG from './EPG';
import { EPGProgram } from './IParser';

export interface IEPGRepository {
  findAll(programParams?: EPGProgramsParameters): Promise<EPG[]>
  findOne(id: string, programParams?: EPGProgramsParameters): Promise<EPG | undefined>
  hasRelationships(template: EPG): Promise<boolean>
  ingestEPG(template: EPG): Promise<boolean>
  remove(template: EPG): Promise<boolean>
  save(template: EPG): Promise<boolean>
  removeProgram(epgId: string, program: EPGProgram): Promise<boolean>
  removeAllPrograms(epg: EPG): Promise<boolean>
  saveProgram(epgId: string, program: EPGProgram): Promise<boolean>
  exists(template: EPG): Promise<boolean>
}
