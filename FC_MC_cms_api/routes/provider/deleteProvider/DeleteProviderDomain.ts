import { LogEntity, LogEvent } from '../../shared/dto/LogDto';
import { ILogTracker } from '../../shared/tracker/ILogTracker';
import { TrackDto } from '../../shared/tracker/LogTrackAdaptor';
import { IProviderRepository } from '../shared/IProviderRepository';
import { ProviderError } from '../shared/ProviderError';

import { IDeleteProviderDomain } from './IDeleteProviderDomain';

export default class DeleteProviderDomain implements IDeleteProviderDomain {
  private readonly repository: IProviderRepository;

  constructor(
    repository: IProviderRepository,
    private readonly logTracker: ILogTracker<TrackDto>,
  ) {
    this.repository = repository;
  }

  async deleteProvider(id: string): Promise<boolean> {
    const provider = await this.repository.findOne(id);
    if (!provider) {
      throw new ProviderError.ProviderNotFound();
    }
    if (await this.repository.hasRelationships(provider)) {
      throw new ProviderError.ProviderHasDependencies();
    }
    const isDeleted = this.repository.remove(provider);
    await this.logTracker.track({
      event: LogEvent.DELETE,
      entity: LogEntity.PROVIDER,
      entityId: provider.id,
    });
    return isDeleted;
  }
}
