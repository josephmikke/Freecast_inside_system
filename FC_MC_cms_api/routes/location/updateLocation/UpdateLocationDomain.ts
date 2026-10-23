import { IFactory } from 'routes/shared/interfaces/IFactory';

import { LocationRequestDto, LocationDto, LocationType } from '../../shared/dto/LocationDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { ILocationRepository } from '../shared/ILocationRepository';
import Location from '../shared/Location';
import { LocationError } from '../shared/LocationError';
import LocationFactory from '../shared/LocationFactory';
import LocationRepository from '../shared/LocationRepository';

import { IUpdateLocationDomain } from './IUpdateLocationDomain';

export default class UpdateLocationDomain implements IUpdateLocationDomain {
  private readonly locationRepository: ILocationRepository;

  private readonly locationFactory: IFactory<Location, LocationRequestDto, LocationDto>;

  constructor(
    locationRepository: ILocationRepository,
    locationFactory: IFactory<Location, LocationRequestDto, LocationDto>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.locationRepository = locationRepository;
    this.locationFactory = locationFactory;
  }

  private static isSlugDifferent(original: Location, updated: Partial<LocationRequestDto>) {
    return updated.slug && original.slug !== updated.slug;
  }

  private async updateLocationItem(
    originalLocation: LocationDto,
    newProps: Partial<LocationRequestDto>,
  ) {
    const updatedLocationDto = Object
      .assign({}, originalLocation, newProps, {
        updatedAt: new Date().toISOString(),
      });

    const updatedLocation = await this.locationRepository.updateAffiliations(
      await this.locationFactory.toDomain(updatedLocationDto),
      newProps,
    );
    return updatedLocation;
  }

  async updateLocation(
    id: string,
    newProps: Partial<LocationRequestDto>,
  ): Promise<boolean> {
    const originalLocation = await this.locationRepository.findOne(id);
    if (!originalLocation) {
      throw new LocationError.LocationNotFound();
    }
    if (UpdateLocationDomain.isSlugDifferent(originalLocation, newProps)) {
      const updatedLocation = Object.assign({}, originalLocation, newProps);
      if (await this.locationRepository.exists(updatedLocation)) {
        throw new LocationError.LocationAlreadyExist();
      }
    }
    // Look for dependencies error
    await LocationRepository.checkDependenciesDto(
      this.locationRepository,
      newProps.countries,
      LocationType.COUNTRY,
    );
    await LocationRepository.checkDependenciesDto(
      this.locationRepository,
      newProps.states,
      LocationType.STATE,
    );
    await LocationRepository.checkDependenciesDto(
      this.locationRepository,
      newProps.cities,
      LocationType.CITY,
    );
    await LocationRepository.checkDependenciesDto(
      this.locationRepository,
      newProps.zipCodes,
      LocationType.ZIPCODE,
    );
    await (this.locationFactory as LocationFactory)
      .checkPackagesDependenciesDto(newProps.packages);
    const updatedLocation = await this
      .updateLocationItem(this.locationFactory.toPersistence(originalLocation), newProps);
    try {
      await this.locationRepository.remove(originalLocation);
      const isUpdated = await this.locationRepository.save(updatedLocation);
      await this.logTracker.track({
        event: LogEvent.UPDATE,
        entity: LogEntity.LOCATION,
        entityId: updatedLocation.id,
      });
      return isUpdated;
    } catch (e) {
      await this.locationRepository.save(originalLocation);
      throw e;
    }
  }
}
