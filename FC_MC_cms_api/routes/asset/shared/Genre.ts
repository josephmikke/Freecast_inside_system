import { GenreDto } from '../../shared/dto/GenreDto';
import IAsset from '../../shared/interfaces/Asset';

export default class Genre implements IAsset {
  public readonly createdAt: string;

  public readonly updatedAt: string;

  public readonly name: string;

  public readonly id: string;

  public readonly extId: string;

  public readonly enabled: boolean;

  constructor({
    id, createdAt, updatedAt, name, extId, enabled,
  }: Required<GenreDto>) {
    this.id = id;
    this.name = name;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.enabled = enabled;
    this.extId = extId;
  }
}
