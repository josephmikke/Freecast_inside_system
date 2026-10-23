import { ProviderRequestDto } from '../../shared/dto/ProviderDto';

export interface IUpdateProviderDomain {
  updateProvider(id: string, props: Partial<ProviderRequestDto>): Promise<boolean>
}
