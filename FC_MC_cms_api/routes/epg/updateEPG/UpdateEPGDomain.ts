import { IEPGTemplateRepository } from '../../epgTemplate/shared/IEPGTemplateRepository';
import { EPGDto, EPGRequestDto } from '../../shared/dto/EPGDto';
import { EpgTemplateType } from '../../shared/dto/EPGTemplateDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import ICDNAdaptor from '../../shared/interfaces/ICDNAdaptor';
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

import { IUpdateEPGDomain } from './IUpdateEPGDomain';

interface Parser {
  csv: IParser<GenericObject, EPGProgram>,
  json: IParser<GenericObject, EPGProgram>,
  xml: IParser<GenericObject, EPGProgram>
}

type UpdatedProps = {
  programs?: EPGProgram[],
} & Partial<EPGRequestDto>;

export default class UpdateEPGDomain implements IUpdateEPGDomain {
  constructor(
    private readonly epgRepository: IEPGRepository,
    private readonly epgTemplateRepository: IEPGTemplateRepository,
    private readonly parser: Parser,
    private readonly epgFactory: IFactory<EPG, EPGRequestDto, EPGDto>,
    private readonly scheduler: IScheduler<Target>,
    private readonly schedulerArn: string,
    private readonly schedulerRoleArn: string,
    private readonly fileStorage: IStorageAdaptor,
    private readonly cdnAdaptor: ICDNAdaptor,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
  }

  private keepOldPrograms(oldPrograms: Array<EPGProgram>, newPrograms: Array<EPGProgram>) {
    const oldExtIds = oldPrograms.map((oldProgram) => oldProgram.ext_id);

    return [
      ...oldPrograms,
      ...newPrograms.filter((newProgram) => !oldExtIds.includes(newProgram.ext_id)),
    ];
  }

  private async updateEpgPrograms(originalEPG: EPG, newProps: Partial<EPGRequestDto>) {
    const epgTemplate = newProps.epgTemplate ?? originalEPG.epgTemplate.id;
    let { programs } = originalEPG;
    const ingestionUrl = newProps.ingestionUrl ?? originalEPG.ingestionUrl;

    if (newProps.epgTemplate !== undefined || newProps.ingestionUrl !== undefined) {
      const epgTemplateItem = await this.epgTemplateRepository.findOne(epgTemplate);
      let rawEPG: GenericObject;
      if (!epgTemplateItem) throw new EPGError.UnknownEPGDependency();
      switch (epgTemplateItem.templateType) {
        case EpgTemplateType.JSON:
          rawEPG = await this.parser.json.fetch(ingestionUrl);
          programs = this.keepOldPrograms(
            programs,
            this.parser.json.parse(rawEPG, epgTemplateItem.mapping),
          );
          break;

        case EpgTemplateType.CSV:
          rawEPG = await this.parser.csv.fetch(ingestionUrl);
          programs = this.keepOldPrograms(
            programs,
            this.parser.csv.parse(rawEPG, epgTemplateItem.mapping),
          );
          break;

        case EpgTemplateType.XML:
          rawEPG = await this.parser.xml.fetch(ingestionUrl);
          programs = this.keepOldPrograms(
            programs,
            this.parser.xml.parse(rawEPG, epgTemplateItem.mapping),
          );
          break;

        default:
          throw new EPGError.UnknownEPGDependency();
      }
    }
    return {
      ...newProps,
      epgTemplate,
      programs,
      ingestionUrl,
    };
  }

  private async updateThumbnail(originalEPG: EPG, newProps: Partial<EPGRequestDto>) {
    let path = originalEPG.thumbnail.value();
    const modifiedThumbnails = [];

    if (newProps.thumbnail) {
      path = await this.fileStorage.store(
        `epg/${originalEPG.id}`,
        newProps.thumbnail,
        'thumbnail',
      );
      await modifiedThumbnails.push(`/${path}`);
    }
    try {
      await this.cdnAdaptor.invalidateCache(modifiedThumbnails);
    } catch (e) {
      console.error(e);
    }
    return {
      ...newProps, thumbnail: path,
    };
  }

  private async updateNewProps(originalEPG: EPG, newProps: Partial<EPGRequestDto>) {
    const updatedProps: UpdatedProps = await this.updateThumbnail(originalEPG, newProps);

    return this.updateEpgPrograms(originalEPG, updatedProps);
  }

  private async handleScheduleChanges(epg: EPG) {
    const ruleName = `${epg.id.toLowerCase()}-schedule`;
    // unschedule previous rule
    await this.scheduler.removeSchedule(ruleName);

    // schedule new rule
    await this.scheduler.schedule(
      `${epg.id.toLowerCase()}-schedule`,
      epg.ingestionSchedule,
      epg.timezone,
      {
        Arn: this.schedulerArn,
        RoleArn: this.schedulerRoleArn,
        Input: JSON.stringify({
          epgId: epg.id,
        }),
      },
    );
  }

  async updateEPG(id: string, epg: Partial<EPGRequestDto>): Promise<boolean> {
    const entity = await this.epgRepository.findOne(id, { filter: {}, ignore: true });

    if (!entity) throw new EPGError.EPGNotFound();
    const updatedProps = await this.updateNewProps(entity, epg);

    // update EPG and updatedDate
    const updatedEPG = await this.epgFactory.toDomain(Object
      .assign({}, entity, updatedProps, {
        updatedAt: new Date().toISOString(),
      }));

    // if extId is updated but it is already taken
    if (updatedProps.extId !== undefined && await this.epgRepository.exists(updatedEPG)) {
      throw new EPGError.EPGAlreadyExist();
    }

    if (epg.ingestionSchedule !== undefined) {
      await this.handleScheduleChanges(updatedEPG);
    }
    try {
      await this.epgRepository.remove(entity);

      const isUpdated = await this.epgRepository.save(updatedEPG);

      await this.logTracker.track({
        event: LogEvent.UPDATE,
        entity: LogEntity.EPG,
        entityId: updatedEPG.id,
      });

      return isUpdated;
    } catch (err) {
      await this.epgRepository.save(entity);
      throw err;
    }
  }
}
