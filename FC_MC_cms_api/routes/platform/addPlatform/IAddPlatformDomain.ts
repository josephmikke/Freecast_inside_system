import { PlatformRequestDto } from '../../shared/dto/PlatformDto';
import Platform from '../shared/Platform';

export interface IAddPlatformDomain {
  addNewPlatform(platform: PlatformRequestDto): Promise<Platform>
}
