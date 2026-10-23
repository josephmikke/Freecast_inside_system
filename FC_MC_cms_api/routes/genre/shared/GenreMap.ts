import { GenreDto, GenreRequestDto } from '../../shared/dto/GenreDto';
import { IMapper } from '../../shared/interfaces/IMapper';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import Genre from './Genre';

export default class GenreMap implements IMapper<Genre, GenreRequestDto, GenreDto> {
  private readonly uid: UID;

  constructor(uid: UID) {
    this.uid = uid;
  }

  toDomain(raw: GenreDto): Genre {
    return Genre.create({
      extId: raw.extId,
      name: raw.name,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      weight: raw.weight,
      enabled: raw.enabled ?? true,
    }, raw.id ?? this.uid.generate(8));
  }

  toDto(raw: GenreDto): Genre {
    return Genre.create({
      extId: raw.extId,
      name: raw.name,
      weight: raw.weight,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      createdAt: raw.createdAt ?? new Date().toISOString(),
      enabled: raw.enabled ?? true,
    }, raw.id ?? this.uid.generate(8));
  }
}
