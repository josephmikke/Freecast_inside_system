import { UID } from '/opt/nodejs/powertools/UIDGenerator';

import { IPackageRepository } from '../../package/shared/IPackageRepository';
import { IPlatformRepository } from '../../platform/shared/IPlatformRepository';
import { IProviderRepository } from '../../provider/shared/IProviderRepository';
import { AutoIngestionDto, AutoIngestionRequestDto } from '../../shared/dto/AutoIngestionDto';
import { IFactory } from '../../shared/interfaces/IFactory';

import AutoIngestion, { AutoIngestionProps } from './AutoIngestion';
import { AutoIngestionError } from './AutoIngestionError';

export type AutoIngestionFactoryDto = AutoIngestionRequestDto & Partial<AutoIngestionDto>;

export default class AutoIngestionFactory implements
    IFactory<AutoIngestion, AutoIngestionRequestDto, AutoIngestionFactoryDto> {
  constructor(
    private readonly uid: UID,
    private readonly providerRepository: IProviderRepository,
    private readonly packageRepository: IPackageRepository,
    private readonly platformRepository: IPlatformRepository,
  ) {}

  private static normalizeName(value: string) {
    return value.trim().toLowerCase();
  }

  private static toArray(value?: string | string[]) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  private async resolveProviderID(raw: AutoIngestionFactoryDto) {
    if (raw.providerID) return raw.providerID;
    if (!raw.provider_name) throw new AutoIngestionError.UnknownAutoIngestionDependency();

    const providers = await this.providerRepository.findAll();
    const provider = providers.find(
      (item) => AutoIngestionFactory.normalizeName(item.name)
        === AutoIngestionFactory.normalizeName(raw.provider_name!),
    );

    if (!provider) throw new AutoIngestionError.UnknownAutoIngestionDependency();
    return provider.id;
  }

  private async resolvePackageIDs(raw: AutoIngestionFactoryDto) {
    if (raw.package_ids?.length) return raw.package_ids;
    const packageNames = AutoIngestionFactory.toArray(raw.package_name);
    if (!packageNames.length) throw new AutoIngestionError.UnknownAutoIngestionDependency();

    const packages = await this.packageRepository.findAll();
    const packageIDs = packageNames.map((name) => {
      const packageItem = packages.find(
        (item) => AutoIngestionFactory.normalizeName(item.name)
          === AutoIngestionFactory.normalizeName(name),
      );

      if (!packageItem) throw new AutoIngestionError.UnknownAutoIngestionDependency();
      return packageItem.id;
    });

    return packageIDs;
  }

  private async resolvePlatformIDs(raw: AutoIngestionFactoryDto) {
    if (raw.platform_ids?.length) return raw.platform_ids;
    const platformNames = AutoIngestionFactory.toArray(raw.platform);
    if (!platformNames.length) throw new AutoIngestionError.UnknownAutoIngestionDependency();

    const platforms = await this.platformRepository.findAll();
    if (platformNames.some((name) => AutoIngestionFactory.normalizeName(name) === 'all platforms')) {
      return platforms.map((platform) => platform.id);
    }

    return platformNames.map((name) => {
      const platform = platforms.find(
        (item) => AutoIngestionFactory.normalizeName(item.name)
          === AutoIngestionFactory.normalizeName(name),
      );

      if (!platform) throw new AutoIngestionError.UnknownAutoIngestionDependency();
      return platform.id;
    });
  }

  async toDomain(raw: AutoIngestionFactoryDto): Promise<AutoIngestion> {
    return AutoIngestion.create({
      createdAt: raw.createdAt ?? new Date().toISOString(),
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      enabled: raw.enabled ?? true,
      providerID: await this.resolveProviderID(raw),
      package_ids: await this.resolvePackageIDs(raw),
      platform_ids: await this.resolvePlatformIDs(raw),
      mrss_feed: raw.mrss_feed,
      schedule: raw.schedule,
      timezone: raw.timezone ?? 'UTC',
      ingestion_ids: raw.ingestion_ids ?? [],
      scheduler_id: raw.scheduler_id ?? '',
    }, raw.id || this.uid.generate(8));
  }

  toPersistence(raw: AutoIngestion): AutoIngestionProps {
    return {
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      enabled: raw.enabled,
      providerID: raw.providerID,
      package_ids: raw.package_ids,
      platform_ids: raw.platform_ids,
      mrss_feed: raw.mrss_feed,
      schedule: raw.schedule,
      timezone: raw.timezone,
      ingestion_ids: raw.ingestion_ids,
      scheduler_id: raw.scheduler_id,
    };
  }
}
