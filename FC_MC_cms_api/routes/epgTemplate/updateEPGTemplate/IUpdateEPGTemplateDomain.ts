import { EPGTemplateRequestDto } from '../../shared/dto/EPGTemplateDto';

export interface IUpdateEPGTemplateDomain {
  updateEpgTemplate(id: string, newProps: Partial<EPGTemplateRequestDto>): Promise<boolean>
}
