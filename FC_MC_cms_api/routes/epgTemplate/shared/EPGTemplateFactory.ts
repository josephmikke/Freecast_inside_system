import { EPGTemplateDto, EPGTemplateRequestDto } from '../../shared/dto/EPGTemplateDto';
import { IFactory } from '../../shared/interfaces/IFactory';

import EPGTemplate from './EPGTemplate';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

export default class EPGTemplateFactory implements IFactory<EPGTemplate,
EPGTemplateRequestDto, EPGTemplateDto> {
  private readonly uid: UID;

  constructor(uid: UID) {
    this.uid = uid;
  }

  toDomain(raw: EPGTemplateDto): Promise<EPGTemplate> | EPGTemplate {
    return EPGTemplate.create({
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: raw.enabled ?? true,
      ...raw,
    }, raw.id || this.uid.generate(8));
  }

  toPersistence(raw: EPGTemplate): EPGTemplateDto {
    return {
      ...raw,
    };
  }
}
