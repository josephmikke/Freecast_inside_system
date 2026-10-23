import IAsset from '../../shared/interfaces/Asset';
import { MediaDto, StreamFormat, StreamType } from '../../shared/dto/MediaDto';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

export default class Media implements IAsset {
  public readonly id: string;

  public readonly createdAt: string;

  public readonly dai: boolean;

  public readonly data: string;

  public readonly updatedAt: string;

  public readonly streamType: StreamType;

  public readonly name: string;

  public readonly active: boolean;

  public readonly streamFormat: StreamFormat;

  public readonly extId: string;

  public readonly enabled: boolean;

  constructor({
    active, createdAt, dai, data, id, name, streamFormat, streamType, updatedAt, enabled,
  }: MediaDto, uid: UID) {
    this.id = id || uid.generate(8);
    this.updatedAt = updatedAt || new Date().toISOString();
    this.createdAt = createdAt || new Date().toISOString();
    this.extId = this.id;
    this.active = active;
    this.dai = dai;
    this.data = data;
    this.name = name;
    this.streamFormat = streamFormat;
    this.streamType = streamType;
    this.enabled = enabled || true;
  }
}
