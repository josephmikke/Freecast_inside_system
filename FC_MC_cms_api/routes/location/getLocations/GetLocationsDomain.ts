import { ILocationRepository } from '../shared/ILocationRepository';
import Location from '../shared/Location';

import { IGetLocationsDomain } from './IGetLocationsDomain';

export default class GetLocationsDomain implements IGetLocationsDomain {
  private readonly locationRepository: ILocationRepository;

  constructor(
    locationRepository: ILocationRepository,
  ) {
    this.locationRepository = locationRepository;
  }

  async getLocations(): Promise<Location[]> {
    return this.locationRepository.findAll();
  }
}
