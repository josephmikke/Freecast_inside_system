import Platform from './Platform';

export interface IPlatformRepository {
  findAll(): Promise<Platform[]>
  findOne(id: string): Promise<Platform | undefined>
  findMany(ids: Array<string>): Promise<Platform[]>
  hasRelationships(platform: Platform): Promise<boolean>
  remove(platform: Platform): Promise<boolean>
  save(platform: Platform): Promise<boolean>
  exists(platform: Platform): Promise<boolean>
}
