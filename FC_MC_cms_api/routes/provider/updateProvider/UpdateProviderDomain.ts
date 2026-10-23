import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ProviderDto, ProviderRequestDto } from '../../shared/dto/ProviderDto';
import { IMapper } from '../../shared/interfaces/IMapper';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { IProviderRepository } from '../shared/IProviderRepository';
import Provider from '../shared/Provider';
import { ProviderError } from '../shared/ProviderError';

import { IUpdateProviderDomain } from './IUpdateProviderDomain';

export default class UpdateProviderDomain implements IUpdateProviderDomain {
  private readonly repository: IProviderRepository;

  private readonly providerMap: IMapper<Provider, ProviderRequestDto, ProviderDto>;

  constructor(
    repository: IProviderRepository,
    providerMap: IMapper<Provider, ProviderRequestDto, ProviderDto>,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
    this.providerMap = providerMap;
  }

  async updateProvider(
    id: string,
    toUpdate: Partial<ProviderRequestDto>,
  ): Promise<boolean> {
    const provider = await this.repository.findOne(id);
    if (!provider) {
      throw new ProviderError.ProviderNotFound();
    }
    if (toUpdate.extId && provider.extId !== toUpdate.extId) {
      if (await this.repository.exists({ ...provider, extId: toUpdate.extId })) {
        throw new ProviderError.ProviderAlreadyExist();
      }
    }
    const updatedProvider = this.providerMap.toDto({
      ...provider,
      ...toUpdate,
      updatedAt: new Date().toISOString(),
    });
    const isUpdated = await this.repository.save(updatedProvider);
    await this.logTracker.track({
      event: LogEvent.UPDATE,
      entity: LogEntity.PROVIDER,
      entityId: updatedProvider.id,
    });
    return isUpdated;
  }
}
