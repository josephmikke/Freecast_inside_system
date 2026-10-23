import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { EPGError } from '../shared/EPGError';
import { IEPGRepository } from '../shared/IEPGRepository';
import {
  EPGProgram,
} from '../shared/IParser';

import { IDeleteAllEPGProgramsDomain } from './IDeleteAllEPGProgramsDomain';

export default class DeleteAllEPGProgramsDomain implements IDeleteAllEPGProgramsDomain {
  constructor(
    private readonly epgRepository: IEPGRepository,
    private readonly fileStorage: IStorageAdaptor,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
  }

  async removeEPGThumbnails(programs: Array<EPGProgram>) {
    await Promise.all(programs.map(async (program) => {
      const thumbnailMatches = program.thumbnail?.match(/((\w+\/\w+\/)+thumbnail\.\w+)$/);
      const alternateThumbnailMatches = program.alternateThumbnail?.match(/((\w+\/\w+\/)+alternate-thumbnail\.\w+)$/);

      if (program.thumbnail?.startsWith(`${process.env.ASSETS_URL}`) && thumbnailMatches && thumbnailMatches?.length >= 1) {
        await this.fileStorage.remove(thumbnailMatches[1]);
      }
      if (program.alternateThumbnail?.startsWith(`${process.env.ASSETS_URL}`) && alternateThumbnailMatches && alternateThumbnailMatches?.length >= 1) {
        await this.fileStorage.remove(alternateThumbnailMatches[1]);
      }
    }));
  }

  async deleteAllEPGProgram(epgId: string): Promise<void> {
    const epg = await this.epgRepository.findOne(epgId, { filter: {}, ignore: true });
    if (!epg) {
      throw new EPGError.EPGNotFound();
    }
    await this.removeEPGThumbnails(epg.programs);
    const isDeleted = this.epgRepository.removeAllPrograms(epg);
    if (!isDeleted) throw new EPGError.EPGCannotBeDeleted();
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.EPG_PROGRAM,
      entityId: epg.id,
    });
  }
}
