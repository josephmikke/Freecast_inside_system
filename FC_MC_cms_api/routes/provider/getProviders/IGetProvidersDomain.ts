import Provider from '../shared/Provider';

export interface IGetProvidersDomain {
  getProviders(): Promise<Provider[]>
}
