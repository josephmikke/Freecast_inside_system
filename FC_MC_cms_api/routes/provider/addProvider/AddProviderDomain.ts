import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ProviderRequestDto } from '../../shared/dto/ProviderDto';
import { IMapper } from '../../shared/interfaces/IMapper';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { IProviderRepository } from '../shared/IProviderRepository';
import Provider from '../shared/Provider';
import { ProviderError } from '../shared/ProviderError';

import { IAddProviderDomain } from './IAddProviderDomain';

export default class AddProviderDomain implements IAddProviderDomain {
  private readonly repository: IProviderRepository;

  private readonly providerMap: IMapper<Provider, ProviderRequestDto, ProviderRequestDto>;

  constructor(
    repository: IProviderRepository,
    providerMap: IMapper<Provider, ProviderRequestDto, ProviderRequestDto>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.providerMap = providerMap;
  }

  async addNewProvider(providerDto: ProviderRequestDto): Promise<Provider> {
    const provider = this.providerMap.toDomain(providerDto);
    if (await this.repository.exists(provider)) {
      throw new ProviderError.ProviderAlreadyExist();
    }
    await this.repository.save(provider);
    await this.logTracker.track({
      event: LogEvent.INSERT,
      entity: LogEntity.PROVIDER,
      entityId: provider.id,
    });
    return provider;
  }
}
