import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { PackageDto, PackageRequestDto } from '../../shared/dto/PackageDto';
import ICDNAdaptor from '../../shared/interfaces/ICDNAdaptor';
import { IFactory } from '../../shared/interfaces/IFactory';
import { IStorageAdaptor } from '../../shared/interfaces/IStorageAdaptor';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { IPackageRepository } from '../shared/IPackageRepository';
import Package from '../shared/Package';
import { PackageError } from '../shared/PackageError';

import { IUpdatePackageDomain } from './IUpdatePackageDomain';

type NonEmptyArray<T> = [T, ...T[]];

export default class UpdatePackageDomain implements IUpdatePackageDomain {
  constructor(
    private readonly packageRepository: IPackageRepository,
    private readonly packageFactory: IFactory<Package, PackageRequestDto, PackageDto>,
    private readonly storage: IStorageAdaptor,
    private readonly cdnAdaptor: ICDNAdaptor,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) { }

  private static containsPlatforms(platforms?: string[]): platforms is NonEmptyArray<string> {
    return !!platforms?.length;
  }

  private static isExternalIdDifferent(original: Package, updated: Partial<PackageRequestDto>) {
    return updated.extId && original.extId !== updated.extId;
  }

  private static overridePlatforms(originalPackage: Package, newProps: Partial<PackageRequestDto>) {
    return Object
      .assign({}, originalPackage, newProps, {
        updatedAt: new Date().toISOString(),
        weight: originalPackage.weight,
      });
  }

  private static keepPlatforms(originalPackage: Package, newProps: Partial<PackageRequestDto>) {
    return Object
      .assign({}, originalPackage, newProps, {
        updatedAt: new Date().toISOString(),
        platforms: originalPackage.platforms.map((platform) => platform.id),
      });
  }

  private async updateNewProps(originalPackage: Package, newProps: Partial<PackageRequestDto>) {
    // We replace base64 payload by image path is an update is required
    let path = originalPackage.thumbnail.value();
    const modifiedThumbnails = [];

    if (newProps.thumbnail) {
      path = await this.storage.store(
        `packages/${originalPackage.id}`,
        newProps.thumbnail,
        'thumbnail',
      );
      await modifiedThumbnails.push(`/${path}`);
    }
    try {
      await this.cdnAdaptor.invalidateCache(modifiedThumbnails);
    } catch (e) {
      console.error(e);
    }
    return {
      ...newProps, thumbnail: path,
    };
  }

  async updatePackage(
    id: string,
    newProps: Partial<PackageRequestDto>,
  ): Promise<boolean> {
    const originalPackage = await this.packageRepository.findOne(id);
    if (!originalPackage) {
      throw new PackageError.PackageNotFound();
    }
    const props = await this.updateNewProps(originalPackage, newProps);
    if (UpdatePackageDomain.isExternalIdDifferent(originalPackage, props)) {
      const updatedPackage = Object.assign({}, originalPackage, props);
      if (await this.packageRepository.exists(updatedPackage)) {
        throw new PackageError.PackageAlreadyExist();
      }
    }
    if (UpdatePackageDomain.containsPlatforms(props.platforms)) {
      const updatedPackage = UpdatePackageDomain.overridePlatforms(originalPackage, props);
      const packageToSave = await this.packageFactory.toDomain(updatedPackage);
      await this.packageRepository.remove(originalPackage);
      const isUpdated = await this.packageRepository.save(packageToSave);
      await this.logTracker.track({
        event: LogEvent.UPDATE,
        entity: LogEntity.PACKAGE,
        entityId: packageToSave.id,
      });
      return isUpdated;
    }
    const updatedPackage = UpdatePackageDomain.keepPlatforms(originalPackage, props);
    const packageToSave = await this.packageFactory.toDomain(updatedPackage);
    await this.packageRepository.remove(originalPackage);
    const isUpdated = await this.packageRepository.save(packageToSave);
    await this.logTracker.track({
      event: LogEvent.UPDATE,
      entity: LogEntity.PACKAGE,
      entityId: packageToSave.id,
    });
    return isUpdated;
  }
}
