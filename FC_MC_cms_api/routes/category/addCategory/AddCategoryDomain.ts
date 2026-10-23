import { LogEntity, LogEvent } from 'routes/shared/dto/LogDto';

import { CategoryDto, CategoryRequestDto } from '../../shared/dto/CategoryDto';
import { IMapper } from '../../shared/interfaces/IMapper';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import Category from '../shared/Category';
import { CategoryError } from '../shared/CategoryError';
import { ICategoryRepository } from '../shared/ICategoryRepository';

import { IAddCategoryDomain } from './IAddCategoryDomain';

export default class AddCategoryDomain implements IAddCategoryDomain {
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

  async addNewCategory(categoryDto: CategoryRequestDto): Promise<Category> {
    const categories = await this.repository.findAll();
    const category = this.categoryMap.toDomain({ ...categoryDto, weight: categories.length });
    if (await this.repository.exists(category)) {
      throw new CategoryError.CategoryAlreadyExist();
    }
    await this.repository.save(category);
    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.CATEGORY,
      entityId: category.id,
    });
    return category;
  }
}
