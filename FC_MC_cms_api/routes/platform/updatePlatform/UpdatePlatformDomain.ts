import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { PlatformDto, PlatformRequestDto } from '../../shared/dto/PlatformDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { IPlatformRepository } from '../shared/IPlatformRepository';
import Platform from '../shared/Platform';
import { PlatformError } from '../shared/PlatformError';

import { IUpdatePlatformDomain } from './IUpdatePlatformDomain';

export default class UpdatePlatformDomain implements IUpdatePlatformDomain {
  private readonly repository: IPlatformRepository;

  private readonly platformMap: IFactory<Platform, PlatformRequestDto, PlatformDto>;

  constructor(
    repository: IPlatformRepository,
    platformMap: IFactory<Platform, PlatformRequestDto, PlatformDto>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.platformMap = platformMap;
  }

  private static overridePlatform(
    originalPlatform: Platform,
    updates: Partial<PlatformRequestDto>,
  ) {
    return Object.assign({}, originalPlatform, updates, {
      updatedAt: new Date().toISOString(),
    });
  }

  async updatePlatform(
    id: string,
    updates: Partial<PlatformRequestDto>,
  ): Promise<boolean> {
    const originalPlatform = await this.repository.findOne(id);
    if (!originalPlatform) {
      throw new PlatformError.PlatformNotFound();
    }
    if (updates.extId && originalPlatform.extId !== updates.extId) {
      if (await this.repository.exists({ ...originalPlatform, extId: updates.extId })) {
        throw new PlatformError.PlatformAlreadyExist();
      }
    }
    const updatedPlatform = UpdatePlatformDomain.overridePlatform(originalPlatform, updates);
    const platformToSave = await this.platformMap.toDomain(updatedPlatform);
    const isUpdated = await this.repository.save(platformToSave);
    await this.logTracker.track({
      event: LogEvent.UPDATE,
      entity: LogEntity.PLATFORM,
      entityId: platformToSave.id,
    });
    return isUpdated;
  }
}
