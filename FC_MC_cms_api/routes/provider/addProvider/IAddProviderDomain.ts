import { ProviderRequestDto } from '../../shared/dto/ProviderDto';
import Provider from '../shared/Provider';

export interface IAddProviderDomain {
  addNewProvider(provider: ProviderRequestDto): Promise<Provider>
}
