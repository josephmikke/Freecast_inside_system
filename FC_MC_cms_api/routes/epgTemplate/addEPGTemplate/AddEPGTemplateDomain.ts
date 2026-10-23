import { EPGTemplateDto, EPGTemplateRequestDto } from '../../shared/dto/EPGTemplateDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import EPGTemplate from '../shared/EPGTemplate';
import { EPGTemplateError } from '../shared/EPGTemplateError';
import { IEPGTemplateRepository } from '../shared/IEPGTemplateRepository';

import { IAddEPGTemplateDomain } from './IAddEPGTemplateDomain';

export default class AddEPGTemplateDomain implements IAddEPGTemplateDomain {
  private readonly repository: IEPGTemplateRepository;

  private readonly epgTemplateMap: IFactory<EPGTemplate, EPGTemplateRequestDto, EPGTemplateDto>;

  constructor(
    repository: IEPGTemplateRepository,
    epgTemplateMap: IFactory<EPGTemplate, EPGTemplateRequestDto, EPGTemplateDto>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.epgTemplateMap = epgTemplateMap;
  }

  async addNewEPGTemplate(epgTemplateDto: EPGTemplateRequestDto): Promise<EPGTemplate> {
    const epgTemplate = await this.epgTemplateMap.toDomain(epgTemplateDto);
    if (await this.repository.exists(epgTemplate)) {
      throw new EPGTemplateError.EPGTemplateAlreadyExist();
    }
    await this.repository.save(epgTemplate);
    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.EPG_TEMPLATE,
      entityId: epgTemplate.id,
    });
    return epgTemplate;
  }
}
