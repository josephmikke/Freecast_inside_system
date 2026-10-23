import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { PackageDto, PackageRequestDto } from '../../shared/dto/PackageDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { IPackageRepository } from '../shared/IPackageRepository';
import Package from '../shared/Package';
import { PackageError } from '../shared/PackageError';

import { IAddPackageDomain } from './IAddPackageDomain';

export default class AddPackageDomain implements IAddPackageDomain {
  constructor(
    private readonly packageRepository: IPackageRepository,
    private readonly packageFactory: IFactory<Package, PackageRequestDto, PackageDto>,
    private readonly fileStorage: IStorageAdaptor,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) { }

  async addNewPackage(packageDto: PackageRequestDto): Promise<Package> {
    const packages = await this.packageRepository.findAll();
    const packageItem = await this.packageFactory
      .toDomain({ ...packageDto, weight: packages.length });
    if (await this.packageRepository.exists(packageItem)) {
      throw new PackageError.PackageAlreadyExist();
    }
    try {
      const path = await this.fileStorage.store(`packages/${packageItem.id}`, packageItem.thumbnail.value(), 'thumbnail');
      packageItem.updateThumbnail(path);
    } catch (e) {
      throw new PackageError.UnableToSaveThumbnail();
    }
    await this.packageRepository.save(packageItem);
    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.PACKAGE,
      entityId: packageItem.id,
    });
    return packageItem;
  }
}
