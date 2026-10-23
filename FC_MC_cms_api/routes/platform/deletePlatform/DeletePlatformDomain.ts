import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { IPlatformRepository } from '../shared/IPlatformRepository';
import { PlatformError } from '../shared/PlatformError';

import { IDeletePlatformDomain } from './IDeletePlatformDomain';

export default class DeletePlatformDomain implements IDeletePlatformDomain {
  private readonly repository: IPlatformRepository;

  constructor(
    repository: IPlatformRepository,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
  }

  async deletePlatform(id: string): Promise<boolean> {
    const platform = await this.repository.findOne(id);
    if (!platform) {
      throw new PlatformError.PlatformNotFound();
    }
    if (await this.repository.hasRelationships(platform)) {
      throw new PlatformError.PlatformHasDependencies();
    }
    const isDeleted = this.repository.remove(platform);
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.PLATFORM,
      entityId: platform.id,
    });
    return isDeleted;
  }
}
