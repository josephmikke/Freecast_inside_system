import { PlatformDto, PlatformRequestDto } from '../../shared/dto/PlatformDto';
import { IFactory } from '../../shared/interfaces/IFactory';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import Platform from './Platform';

export default class PlatformMap implements IFactory<Platform, PlatformRequestDto, PlatformDto> {
  private readonly uid: UID;

  constructor(uid: UID) {
    this.uid = uid;
  }

  toDomain(raw: PlatformDto): Platform {
    return Platform.create({
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: raw.enabled ?? true,
      ...raw,
    }, raw.id || this.uid.generate(8));
  }

  toPersistence(platform: Platform): PlatformDto {
    return {
      ...platform,
    };
  }
}
