import { LocationRequestDto } from '../../shared/dto/LocationDto';

export interface IUpdateLocationDomain {
  updateLocation(id: string, props: Partial<LocationRequestDto>): Promise<boolean>
}
