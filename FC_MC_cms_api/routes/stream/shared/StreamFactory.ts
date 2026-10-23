import { StreamDto, StreamRequestDto } from '../../shared/dto/StreamDto';
import { IFactory } from '../../shared/interfaces/IFactory';

import Stream from './Stream';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

export default class ChannelFactory
implements IFactory<Stream, StreamRequestDto, StreamDto> {
  private readonly uid: UID;

  constructor(uid: UID) {
    this.uid = uid;
  }

  async toDomain(raw: StreamRequestDto): Promise<Stream> {
    const id = raw.id || this.uid.generate(8);
    return Stream.create({
      ...raw,
      createdAt: raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      enabled: raw.enabled ?? true,
      extId: raw.extId || id,
      weight: raw.weight ?? 0,
    }, id);
  }

  toPersistence(raw: Stream): StreamDto {
    return {
      ...raw,
    };
  }
}
