import EPGTemplate from './EPGTemplate';

export interface IEPGTemplateRepository {
  findAll(): Promise<EPGTemplate[]>
  findOne(id: string): Promise<EPGTemplate | undefined>
  hasRelationships(template: EPGTemplate): Promise<boolean>
  remove(template: EPGTemplate): Promise<boolean>
  save(template: EPGTemplate): Promise<boolean>
  exists(template: EPGTemplate): Promise<boolean>
}
