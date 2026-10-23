import { LogEntity, LogEvent } from 'routes/shared/dto/LogDto';

import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { CategoryError } from '../shared/CategoryError';
import { ICategoryRepository } from '../shared/ICategoryRepository';

import { IDeleteCategoryDomain } from './IDeleteCategoryDomain';

export default class DeleteCategoryDomain implements IDeleteCategoryDomain {
  private readonly repository: ICategoryRepository;

  constructor(
    repository: ICategoryRepository,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
  }

  async deleteCategory(id: string): Promise<boolean> {
    const category = await this.repository.findOne(id);
    if (!category) {
      throw new CategoryError.CategoryNotFound();
    }
    if (await this.repository.hasRelationships(category)) {
      throw new CategoryError.CategoryHasDependencies();
    }
    await this.repository.remove(category);
    const categories = await this.repository.findAll();
    const updatedCategories = categories.map((item, key) => {
      item.updateWeight(key);
      return item;
    });
    const updated = this.repository.updateWeight(updatedCategories);
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.CATEGORY,
      entityId: category.id,
    });
    return updated;
  }
}
