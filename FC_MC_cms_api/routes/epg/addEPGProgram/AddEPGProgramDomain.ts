import { MovieRating } from '../../asset/shared/Rating';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { EPGError } from '../shared/EPGError';
import { IEPGProgramBuilder } from '../shared/IEPGProgramBuilder';
import { IEPGRepository } from '../shared/IEPGRepository';
import {
  EPGProgram, EPGProgramRequest,
} from '../shared/IParser';

import { IAddEPGProgramDomain } from './IAddEPGProgramDomain';

export default class AddEPGProgramDomain implements IAddEPGProgramDomain {
  constructor(
    private readonly epgRepository: IEPGRepository,
    private readonly fileStorage: IStorageAdaptor,
    private readonly epgProgramBuilder: IEPGProgramBuilder<EPGProgram>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
  }

  private async processProgram(epgId: string, updatedProgramProps: EPGProgram) {
    const base64Validator = /^(data:\w+\/[a-zA-Z+-.]+;base64,)(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gi;
    const newProgramUpdated = updatedProgramProps;

    if (
      updatedProgramProps.thumbnail !== null
      && base64Validator.test(updatedProgramProps.thumbnail)
    ) {
      const path = await this.fileStorage.store(
        `epg/${epgId}/program/${updatedProgramProps.id}`,
        updatedProgramProps.thumbnail,
        'thumbnail',
      );
      newProgramUpdated.thumbnail = `${process.env.ASSETS_URL}/${path}`;
    }
    if (
      updatedProgramProps.alternateThumbnail !== null
      && base64Validator.test(updatedProgramProps.alternateThumbnail)
    ) {
      const path = await this.fileStorage.store(
        `epg/${epgId}/program/${updatedProgramProps.id}`,
        updatedProgramProps.alternateThumbnail,
        'alternate-thumbnail',
      );
      newProgramUpdated.alternateThumbnail = `${process.env.ASSETS_URL}/${path}`;
    }
    return newProgramUpdated;
  }

  async addNewEPGProgram(epgId: string, program: EPGProgramRequest): Promise<EPGProgram> {
    const epg = await this.epgRepository.findOne(epgId, { filter: {}, ignore: true });

    if (!epg) throw new EPGError.EPGNotFound();
    const newProgram = this.epgProgramBuilder
      .create()
      .addTitle(program.title)
      .addSubtitle(program.subtitle ?? '')
      .addDescription(program.description)
      .addStartTime(program.start_time)
      .addEndTime(program.end_time)
      .addExtId(program.ext_id)
      .addSlug(program.slug)
      .addDuration(program.duration)
      .addThumbnail(program.thumbnail ?? '')
      .addAlternateThumbnail(program.alternateThumbnail ?? '')
      .setCatchup(program.catchup ?? false)
      .setArchive(program.archive ?? false)
      .setRating(program.rating ?? MovieRating.NOT_RATED)
      .getResult();

    const toAddProgram = await this.processProgram(epg.id, newProgram);

    await this.epgRepository.saveProgram(epg.id, toAddProgram);

    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.EPG_PROGRAM,
      entityId: toAddProgram.id,
    });

    return toAddProgram;
  }
}
