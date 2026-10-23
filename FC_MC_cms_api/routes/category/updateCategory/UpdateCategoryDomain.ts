import { CategoryDto, CategoryRequestDto } from '../../shared/dto/CategoryDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IMapper } from '../../shared/interfaces/IMapper';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import Category from '../shared/Category';
import { CategoryError } from '../shared/CategoryError';
import { ICategoryRepository } from '../shared/ICategoryRepository';

import { IUpdateCategoryDomain } from './IUpdateCategoryDomain';

export default class UpdateCategoryDomain implements IUpdateCategoryDomain {
  private readonly repository: ICategoryRepository;

  private readonly categoryMap: IMapper<Category, CategoryRequestDto, CategoryDto>;

  constructor(
    repository: ICategoryRepository,
    categoryMap: IMapper<Category, CategoryRequestDto, CategoryDto>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.categoryMap = categoryMap;
  }

  async updateCategory(
    id: string,
    toUpdate: Partial<CategoryRequestDto>,
  ): Promise<boolean> {
    const category = await this.repository.findOne(id);
    if (!category) {
      throw new CategoryError.CategoryNotFound();
    }
    if (toUpdate.extId && category.extId !== toUpdate.extId) {
      if (await this.repository.exists(Object.assign({}, category, { extId: toUpdate.extId }))) {
        throw new CategoryError.CategoryAlreadyExist();
      }
    }
    const updatedCategory = this.categoryMap.toDto({
      ...category,
      ...toUpdate,
      weight: category.weight,
      updatedAt: new Date().toISOString(),
    });
    const updated = this.repository.save(updatedCategory);
    await this.logTracker.track({
      event: LogEvent.UPDATE,
      entity: LogEntity.CATEGORY,
      entityId: category.id,
    });
    return updated;
  }
}
