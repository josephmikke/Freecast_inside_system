import Location from '../shared/Location';

export interface IGetLocationsDomain {
  getLocations(): Promise<Location[]>
}
