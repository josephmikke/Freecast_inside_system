import { ProviderDto, ProviderRequestDto } from '../../shared/dto/ProviderDto';
import { IMapper } from '../../shared/interfaces/IMapper';

import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import Provider from './Provider';

export default class ProviderMap implements IMapper<Provider, ProviderRequestDto, ProviderDto> {
  private readonly uid: UID;

  constructor(uid: UID) {
    this.uid = uid;
  }

  toDomain(raw: ProviderRequestDto): Provider {
    return Provider.create({
      configuration: raw.configuration,
      format: raw.format,
      subscription: raw.subscription,
      type: raw.type,
      extId: raw.extId,
      name: raw.name,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      enabled: raw.enabled ?? true,
      mtSlug: raw.mtSlug ?? "",
      hlsMtSlug: raw.hlsMtSlug ?? "",
      aidSlug: raw.aidSlug ?? ""
    }, this.uid.generate(8));
  }

  toDto(raw: ProviderDto): Provider {
    return Provider.create({
      configuration: raw.configuration,
      format: raw.format,
      subscription: raw.subscription,
      type: raw.type,
      extId: raw.extId,
      name: raw.name,
      updatedAt: raw.updatedAt,
      createdAt: raw.createdAt,
      enabled: raw.enabled ?? true,
      mtSlug: raw.mtSlug ?? "",
      hlsMtSlug: raw.hlsMtSlug ?? "",
      aidSlug: raw.aidSlug ?? ""
    }, raw.id);
  }
}
