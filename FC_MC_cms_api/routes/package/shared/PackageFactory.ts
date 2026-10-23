import { IPlatformRepository } from '../../platform/shared/IPlatformRepository';
import { PackageDto, PackageRequestDto } from '../../shared/dto/PackageDto';
import { IFactory } from '../../shared/interfaces/IFactory';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import Package from './Package';
import { PackageError } from './PackageError';

export default class PackageFactory implements IFactory<Package, PackageRequestDto, PackageDto> {
  constructor(
    private readonly uid: UID,
    private readonly platformRepository: IPlatformRepository,
  ) {}

  async toDomain(raw: PackageDto): Promise<Package> {
    const packageItem = Package.create({
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      enabled: raw.enabled ?? true,
      ...raw,
    }, raw.id || this.uid.generate(8));

    if (!raw.platforms?.length) {
      return packageItem;
    }

    const platforms = await this.platformRepository.findMany(raw.platforms);

    // Always sort platforms by name
    platforms.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    if (platforms.length !== raw.platforms?.length) {
      throw new PackageError.UnknownPackageDependency();
    }
    platforms.forEach((platform) => packageItem.addPlatform(platform));
    return packageItem;
  }

  toPersistence(raw: Package): PackageDto {
    return {
      ...raw,
      thumbnail: raw.thumbnail.value(),
      platforms: Array.from(raw.platforms).map((platform) => platform.id),
    };
  }
}
