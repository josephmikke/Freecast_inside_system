import { IEPGTemplateRepository } from '../../epgTemplate/shared/IEPGTemplateRepository';
import { EPGDto, EPGRequestDto } from '../../shared/dto/EPGDto';
import { EpgTemplateType } from '../../shared/dto/EPGTemplateDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { IScheduler } from '../../shared/scheduler/IScheduler';
import { Target } from '../../shared/scheduler/SchedulerAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import EPG from '../shared/EPG';
import { EPGError } from '../shared/EPGError';
import { IEPGRepository } from '../shared/IEPGRepository';
import { EPGProgram, GenericObject, IParser } from '../shared/IParser';

import { IAddEPGDomain } from './IAddEPGDomain';

interface Parser {
  csv: IParser<GenericObject, EPGProgram>,
  json: IParser<GenericObject, EPGProgram>,
  xml: IParser<GenericObject, EPGProgram>
}

export default class AddEPGDomain implements IAddEPGDomain {
  constructor(
    private readonly epgRepository: IEPGRepository,
    private readonly epgTemplateRepository: IEPGTemplateRepository,
    private readonly parser: Parser,
    private readonly epgFactory: IFactory<EPG, EPGRequestDto, EPGDto>,
    private readonly scheduler: IScheduler<Target>,
    private readonly schedulerArn: string,
    private readonly schedulerRoleArn: string,
    private readonly fileStorage: IStorageAdaptor,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
  }

  private async parseEpg(epg: EPGRequestDto) {
    const epgTemplate = await this.epgTemplateRepository.findOne(epg.epgTemplate);
    let rawEPG: GenericObject;
    if (!epgTemplate) throw new EPGError.UnknownEPGDependency();
    switch (epgTemplate.templateType) {
      case EpgTemplateType.JSON:
        rawEPG = await this.parser.json.fetch(epg.ingestionUrl);
        return this.parser.json.parse(rawEPG, epgTemplate.mapping);

      case EpgTemplateType.CSV:
        rawEPG = await this.parser.csv.fetch(epg.ingestionUrl);
        return this.parser.csv.parse(rawEPG, epgTemplate.mapping);

      case EpgTemplateType.XML:
        rawEPG = await this.parser.xml.fetch(epg.ingestionUrl);
        return this.parser.xml.parse(rawEPG, epgTemplate.mapping);

      default:
        throw new EPGError.UnknownEPGDependency();
    }
  }

  private async schedule(entity: EPG) {
    await this.scheduler.schedule(
      `${entity.id.toLowerCase()}-schedule`,
      entity.ingestionSchedule,
      entity.timezone,
      {
        Arn: this.schedulerArn,
        RoleArn: this.schedulerRoleArn,
        Input: JSON.stringify({
          epgId: entity.id,
        }),
      },
    );
  }

  async addNewEPG(epg: EPGRequestDto): Promise<any> {
    const programs = await this.parseEpg(epg);
    const entity = await this.epgFactory.toDomain({
      ...epg,
      programs,
    });
    if (await this.epgRepository.exists(entity)) {
      throw new EPGError.EPGAlreadyExist();
    }
    await this.schedule(entity);
    const path = await this.fileStorage.store(`epg/${entity.id}`, entity.thumbnail.value(), 'thumbnail');
    entity.updateThumbnail(path);
    await this.epgRepository.save(entity);
    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.EPG,
      entityId: entity.id,
    });
    return entity;
  }
}
