import { IEPGTemplateRepository } from '../../epgTemplate/shared/IEPGTemplateRepository';
import { EPGDto, EPGRequestDto } from '../../shared/dto/EPGDto';
import { IFactory } from '../../shared/interfaces/IFactory';

import EPG from './EPG';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import { EPGError } from './EPGError';

export default class EPGFactory implements IFactory<EPG, EPGRequestDto, EPGDto> {
  constructor(
    private readonly uid: UID,
    private readonly epgTemplateRepository: IEPGTemplateRepository,
  ) {
  }

  async toDomain(raw: EPGDto): Promise<EPG> {
    const epg = EPG.create({
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: raw.enabled ?? true,
      ...raw,
    }, raw.id || this.uid.generate(8));

    const epgTemplate = await this.epgTemplateRepository.findOne(raw.epgTemplate);
    if (!epgTemplate) {
      throw new EPGError.UnknownEPGDependency();
    }

    return epg.addEPGTemplate(epgTemplate).addEPGPrograms(raw.programs);
  }

  toPersistence(epg: EPG): Required<EPGDto> {
    return {
      ...epg,
      thumbnail: epg.thumbnail.value(),
      ingestionSchedule: epg.ingestionSchedule.value(),
      epgTemplate: epg.epgTemplate!.id,
    };
  }
}
