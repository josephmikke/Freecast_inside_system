import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import ICDNAdaptor from '../../shared/interfaces/ICDNAdaptor';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { EPGError } from '../shared/EPGError';
import { IEPGRepository } from '../shared/IEPGRepository';
import { EPGProgram } from '../shared/IParser';

import { IUpdateEPGProgramDomain } from './IUpdateEPGProgramDomain';

export default class UpdateEPGProgramDomain implements IUpdateEPGProgramDomain {
  constructor(
    private readonly epgRepository: IEPGRepository,
    private readonly fileStorage: IStorageAdaptor,
    private readonly cdnAdaptor: ICDNAdaptor,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
  }

  private async processUpdateProgram(epgId: string, updatedProgramProps: EPGProgram) {
    const base64Validator = /^(data:\w+\/[a-zA-Z+-.]+;base64,)(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gi;
    const newProgramUpdated = updatedProgramProps;
    const modifiedThumbnails = [];

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
      await modifiedThumbnails.push(`/${path}`);
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
      await modifiedThumbnails.push(`/${path}`);
    }
    try {
      await this.cdnAdaptor.invalidateCache(modifiedThumbnails);
    } catch (e) {
      console.error(e);
    }
    return newProgramUpdated;
  }

  async updateEPGProgram(
    epgId: string,
    id: string,
    programProps: Partial<EPGProgram>,
  ): Promise<boolean> {
    const epg = await this.epgRepository.findOne(epgId, { filter: {}, ignore: true });

    if (!epg) throw new EPGError.EPGNotFound();
    const program = epg.programs.find((programItem) => programItem.id === id);

    if (!program) throw new EPGError.UnknownEPGDependency(`Program with id ${id} not found.`);
    const updatedProgramProps: EPGProgram = {
      ...program,
      ...programProps,
      id,
    };

    const updatedProgram = await this.processUpdateProgram(epg.id, updatedProgramProps);
    try {
      await this.epgRepository.removeProgram(epg.id, program);
      await this.epgRepository.saveProgram(epg.id, updatedProgram);
    } catch (err) {
      await this.epgRepository.saveProgram(epg.id, program);
      throw new EPGError.EPGCannotBeDeleted('Error while updating programs.');
    }

    await this.logTracker.track({
      event: LogEvent.UPDATE,
      entity: LogEntity.EPG_PROGRAM,
      entityId: epg.id,
    });

    return true;
  }
}
