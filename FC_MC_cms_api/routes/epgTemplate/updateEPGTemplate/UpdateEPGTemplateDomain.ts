import { EPGTemplateDto, EPGTemplateRequestDto } from '../../shared/dto/EPGTemplateDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import EPGTemplate from '../shared/EPGTemplate';
import { EPGTemplateError } from '../shared/EPGTemplateError';
import { IEPGTemplateRepository } from '../shared/IEPGTemplateRepository';

import { IUpdateEPGTemplateDomain } from './IUpdateEPGTemplateDomain';

export default class UpdateEPGTemplateDomain implements IUpdateEPGTemplateDomain {
  constructor(
    private readonly repository: IEPGTemplateRepository,
    private readonly epgTemplateFactory:
    IFactory<EPGTemplate, EPGTemplateRequestDto, EPGTemplateDto>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

  async updateEpgTemplate(id: string, newProps: Partial<EPGTemplateRequestDto>): Promise<boolean> {
    const template = await this.repository.findOne(id);
    if (!template) {
      throw new EPGTemplateError.EPGTemplateNotFound();
    }
    if (newProps.extId && template.extId !== newProps.extId) {
      if (await this.repository.exists({ ...template, extId: newProps.extId })) {
        throw new EPGTemplateError.EPGTemplateAlreadyExist();
      }
    }
    const updatedEPGTemplate = await this.epgTemplateFactory.toDomain({
      ...template,
      ...newProps,
      updatedAt: new Date().toISOString(),
    });
    const isUpdated = this.repository.save(updatedEPGTemplate);
    await this.logTracker.track({
      event: LogEvent.UPDATE,
      entity: LogEntity.EPG_TEMPLATE,
      entityId: updatedEPGTemplate.id,
    });
    return isUpdated;
  }
}
