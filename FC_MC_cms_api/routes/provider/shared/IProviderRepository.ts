import Provider from './Provider';

export interface IProviderRepository {
  findAll(): Promise<Provider[]>
  findOne(id: string): Promise<Provider | undefined>
  hasRelationships(provider: Provider): Promise<boolean>
  remove(provider: Provider): Promise<boolean>
  save(provider: Provider): Promise<boolean>
  exists(provider: Provider): Promise<boolean>
}
