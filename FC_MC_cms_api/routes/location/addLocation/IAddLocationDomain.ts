import { LocationRequestDto } from '../../shared/dto/LocationDto';
import Location from '../shared/Location';

export interface IAddLocationDomain {
  addNewLocation(locationItem: LocationRequestDto): Promise<Location>
}
