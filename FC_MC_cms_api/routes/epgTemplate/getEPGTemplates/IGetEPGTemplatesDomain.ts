import EPGTemplate from '../shared/EPGTemplate';

export interface IGetEPGTemplatesDomain {
  getEPGTemplates(): Promise<EPGTemplate[]>
}
