import { LocationDto, LocationRequestDto, LocationType } from '../../shared/dto/LocationDto';
import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { IFactory } from '../../shared/interfaces/IFactory';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { ILocationRepository } from '../shared/ILocationRepository';
import Location from '../shared/Location';
import { LocationError } from '../shared/LocationError';
import LocationFactory from '../shared/LocationFactory';
import LocationRepository from '../shared/LocationRepository';

import { IAddLocationDomain } from './IAddLocationDomain';

export default class AddLocationDomain implements IAddLocationDomain {
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

  async addNewLocation(locationDto: LocationRequestDto): Promise<Location> {
    await LocationRepository.checkDependenciesDto(
      this.locationRepository,
      locationDto.countries,
      LocationType.COUNTRY,
    );
    await LocationRepository.checkDependenciesDto(
      this.locationRepository,
      locationDto.states,
      LocationType.STATE,
    );
    await LocationRepository.checkDependenciesDto(
      this.locationRepository,
      locationDto.cities,
      LocationType.CITY,
    );
    await LocationRepository.checkDependenciesDto(
      this.locationRepository,
      locationDto.zipCodes,
      LocationType.ZIPCODE,
    );
    await (this.locationFactory as LocationFactory)
      .checkPackagesDependenciesDto(locationDto.packages);
    const locationItem = await this.locationRepository.updateAffiliations(
      await this.locationFactory.toDomain(locationDto),
      locationDto,
    );
    if (await this.locationRepository.exists(locationItem)) {
      throw new LocationError.LocationAlreadyExist();
    }
    await this.locationRepository.save(locationItem);
    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.LOCATION,
      entityId: locationItem.id,
    });
    return locationItem;
  }
}
