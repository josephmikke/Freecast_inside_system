import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { IScheduler } from '../../shared/scheduler/IScheduler';
import { Target } from '../../shared/scheduler/SchedulerAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { EPGError } from '../shared/EPGError';
import { IEPGRepository } from '../shared/IEPGRepository';
import { EPGProgram } from '../shared/IParser';

import { IDeleteEPGDomain } from './IDeleteEPGDomain';

export default class GetEPGDomain implements IDeleteEPGDomain {
  constructor(
    private readonly epgRepository: IEPGRepository,
    private readonly scheduler: IScheduler<Target>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

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

  async deleteEPG(id: string): Promise<void> {
    const epg = await this.epgRepository.findOne(id, { filter: {}, ignore: true });
    if (!epg) {
      throw new EPGError.EPGNotFound();
    }
    if (await this.epgRepository.hasRelationships(epg)) {
      throw new EPGError.EPGHasDependencies();
    }
    await this.scheduler.removeSchedule(`${epg.id.toLowerCase()}-schedule`);
    await this.fileStorage.remove(epg.thumbnail.value());
    await this.removeEPGThumbnails(epg.programs);
    const isDeleted = this.epgRepository.remove(epg);
    if (!isDeleted) throw new EPGError.EPGCannotBeDeleted();
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.EPG,
      entityId: epg.id,
    });
  }
}
