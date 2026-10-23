import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { PlatformDto, PlatformRequestDto } from '../../shared/dto/PlatformDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { IPlatformRepository } from '../shared/IPlatformRepository';
import Platform from '../shared/Platform';
import { PlatformError } from '../shared/PlatformError';

import { IAddPlatformDomain } from './IAddPlatformDomain';

export default class AddPlatformDomain implements IAddPlatformDomain {
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

  async addNewPlatform(platformDto: PlatformRequestDto): Promise<Platform> {
    const platform = await this.platformMap.toDomain(platformDto);
    if (await this.repository.exists(platform)) {
      throw new PlatformError.PlatformAlreadyExist();
    }
    await this.repository.save(platform);
    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.PLATFORM,
      entityId: platform.id,
    });
    return platform;
  }
}
