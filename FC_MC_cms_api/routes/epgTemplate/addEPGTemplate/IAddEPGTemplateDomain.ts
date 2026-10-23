import { EPGTemplateRequestDto } from '../../shared/dto/EPGTemplateDto';
import EPGTemplate from '../shared/EPGTemplate';

export interface IAddEPGTemplateDomain {
  addNewEPGTemplate(epgTemplate: EPGTemplateRequestDto): Promise<EPGTemplate>
}
