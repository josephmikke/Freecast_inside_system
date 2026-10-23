import { IFactory } from '../../shared/interfaces/IFactory';
import { LogDto, LogRequestDto } from '../../shared/dto/LogDto';

import Log from './Log';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

export default class LogFactory implements IFactory<Log, LogRequestDto, LogDto> {
  private readonly uid: UID;

  constructor(uid: UID) {
    this.uid = uid;
  }

  toDomain(raw: LogDto): Log {
    return Log.create({
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: raw.enabled ?? true,
      entityId: raw.entityId || '',
      user: raw.user || 'admin',
      extId: raw.extId || '',
      ...raw,
    }, raw.id || this.uid.generate(8));
  }

  toPersistence(raw: Log): LogDto {
    return {
      ...raw,
    };
  }
}
