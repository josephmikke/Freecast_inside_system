import { PlatformRequestDto } from '../../shared/dto/PlatformDto';

export interface IUpdatePlatformDomain {
  updatePlatform(id: string, props: Partial<PlatformRequestDto>): Promise<boolean>
}
