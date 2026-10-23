import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { IPackageRepository } from '../shared/IPackageRepository';
import { PackageError } from '../shared/PackageError';

import { IDeletePackageDomain } from './IDeletePackageDomain';

export default class DeletePackageDomain implements IDeletePackageDomain {
  constructor(
    private readonly repository: IPackageRepository,
    private readonly storage: IStorageAdaptor,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {}

  async deletePackage(id: string): Promise<boolean> {
    const packageItem = await this.repository.findOne(id);
    if (!packageItem) {
      throw new PackageError.PackageNotFound();
    }
    if (await this.repository.hasRelationships(packageItem)) {
      throw new PackageError.PackageHasDependencies();
    }
    if (!await this.storage.remove(packageItem.thumbnail.value())) {
      throw new PackageError.UnableToRemoveThumbnail();
    }
    await this.repository.remove(packageItem);
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.PACKAGE,
      entityId: packageItem.id,
    });
    const packages = await this.repository.findAll();
    const updatedPackages = packages.map((item, key) => {
      item.updateWeight(key);
      return item;
    });
    return this.repository.updateWeight(updatedPackages);
  }
}
