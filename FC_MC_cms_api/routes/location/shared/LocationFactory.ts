import { IPackageRepository } from '../../package/shared/IPackageRepository';
import Package from '../../package/shared/Package';
import { PackageError } from '../../package/shared/PackageError';
import {
  LocationDto, LocationRequestDto, LocationType, PersistentLocationDto,
} from '../../shared/dto/LocationDto';
import { IFactory } from '../../shared/interfaces/IFactory';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import Location from './Location';

export default class LocationFactory
implements IFactory<Location, LocationRequestDto, PersistentLocationDto> {
  private readonly uid: UID;

  private readonly packageRepository: IPackageRepository;

  constructor(uid: UID, packageRepository: IPackageRepository) {
    this.uid = uid;
    this.packageRepository = packageRepository;
  }

  async getPackages(packages: Array<string>): Promise<Package[] | undefined> {
    return this.packageRepository.findMany(packages);
  }

  async checkPackagesDependenciesDto(
    idList: Array<string> | undefined,
  ) {
    if (idList?.length) {
      const packages = await this.packageRepository.findMany(idList);

      if (idList.length !== packages?.length) {
        throw new PackageError.UnknownPackageDependency();
      }
    }
  }

  async toDomain(raw: LocationDto): Promise<Location> {
    const locationItem = Location.create({
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      enabled: raw.enabled ?? true,
      extId: raw.extId ?? raw.slug,
      ...raw,
    }, raw.id || this.uid.generate(8));

    if (!raw.packages?.length) {
      return locationItem.sortAffiliations();
    }

    const packages = await this.packageRepository.findMany(raw.packages);

    if (packages?.length !== raw.packages?.length) {
      throw new PackageError.UnknownPackageDependency();
    }
    packages?.forEach((packageItem) => locationItem.addPackage(packageItem));
    return locationItem.sortAffiliations();
  }

  toPersistence(raw: Location): PersistentLocationDto {
    const persistentLocation: PersistentLocationDto = {
      id: raw.id,
      extId: raw.extId,
      slug: raw.slug,
      name: raw.name,
      type: raw.type,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      enabled: raw.enabled,
    };

    if (Location.relations[LocationType.COUNTRY].includes(raw.type) && raw.countries) {
      persistentLocation.countries = Array.from(raw.countries)
        .map((country) => country.id);
    }
    if (Location.relations[LocationType.STATE].includes(raw.type) && raw.states) {
      persistentLocation.states = Array.from(raw.states)
        .map((state) => state.id);
    }
    if (Location.relations[LocationType.CITY].includes(raw.type) && raw.cities) {
      persistentLocation.cities = Array.from(raw.cities)
        .map((city) => city.id);
    }
    persistentLocation.packages = Array.from(raw.packages)
      .map((packageItem) => packageItem.id);
    return persistentLocation;
  }
}
