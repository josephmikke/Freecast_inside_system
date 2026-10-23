import Platform from '../shared/Platform';

export interface IGetPlatformsDomain {
  getPlatforms(): Promise<Platform[]>
}
