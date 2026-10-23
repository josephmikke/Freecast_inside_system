import { CategoryDto, CategoryRequestDto } from '../../shared/dto/CategoryDto';
import { IMapper } from '../../shared/interfaces/IMapper';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import Category from './Category';

export default class CategoryMap implements IMapper<Category, CategoryRequestDto, CategoryDto> {
  private readonly uid: UID;

  constructor(uid: UID) {
    this.uid = uid;
  }

  toDomain(raw: CategoryDto): Category {
    return Category.create({
      extId: raw.extId,
      name: raw.name,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      enabled: raw.enabled ?? true,
      weight: raw.weight,
    }, raw.id ?? this.uid.generate(8));
  }

  toDto(raw: CategoryDto): Category {
    return Category.create({
      extId: raw.extId,
      name: raw.name,
      weight: raw.weight,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      createdAt: raw.createdAt ?? new Date().toISOString(),
      enabled: raw.enabled ?? true,
    }, raw.id ?? this.uid.generate(8));
  }
}
