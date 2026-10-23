import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { ILocationRepository } from '../shared/ILocationRepository';
import { LocationError } from '../shared/LocationError';

import { IDeleteLocationDomain } from './IDeleteLocationDomain';

export default class DeleteLocationDomain implements IDeleteLocationDomain {
  private readonly repository: ILocationRepository;

  constructor(
    repository: ILocationRepository,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
  }

  async deleteLocation(id: string): Promise<boolean> {
    const locationItem = await this.repository.findOne(id);
    if (!locationItem) {
      throw new LocationError.LocationNotFound();
    }
    if (await this.repository.hasRelationships(locationItem)) {
      throw new LocationError.LocationHasDependencies();
    }
    const isDeleted = this.repository.remove(locationItem);
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.LOCATION,
      entityId: locationItem.id,
    });
    return isDeleted;
  }
}
