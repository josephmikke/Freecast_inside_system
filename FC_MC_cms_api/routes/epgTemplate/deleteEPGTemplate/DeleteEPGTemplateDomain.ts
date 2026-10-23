import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { EPGTemplateError } from '../shared/EPGTemplateError';
import { IEPGTemplateRepository } from '../shared/IEPGTemplateRepository';

import { IDeleteEPGTemplateDomain } from './IDeleteEPGTemplateDomain';

export default class DeleteEPGTemplateDomain implements IDeleteEPGTemplateDomain {
  constructor(
    private readonly repository: IEPGTemplateRepository,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

  async deleteEPGTemplate(id: string): Promise<boolean> {
    const epgTemplate = await this.repository.findOne(id);
    if (!epgTemplate) {
      throw new EPGTemplateError.EPGTemplateNotFound();
    }
    if (await this.repository.hasRelationships(epgTemplate)) {
      throw new EPGTemplateError.EPGTemplateHasDependencies();
    }
    const isDeleted = this.repository.remove(epgTemplate);
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.EPG_TEMPLATE,
      entityId: epgTemplate.id,
    });
    return isDeleted;
  }
}
