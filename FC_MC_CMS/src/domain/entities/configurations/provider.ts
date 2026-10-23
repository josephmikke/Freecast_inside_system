import { CommonEntityPayload, CommonEntityResult } from '@entities/common';

interface ProviderConfigurationData {
  [k: string]: string;
}

export type ProviderType = 'CHANNELS' | 'VOD';
export type ProviderFormat = 'INTEGER' | 'DECIMAL';

interface ProviderResult extends CommonEntityResult {
  configuration: ProviderConfigurationData;
  type: ProviderType[];
  subscription: boolean;
  format: ProviderFormat;
  mtSlug?: string | null;
  hlsMtSlug?: string | null;
  aidSlug?: string | null;
}

interface ProviderPayload extends CommonEntityPayload {
  configuration: ProviderConfigurationData;
  type: ProviderType[];
  subscription: boolean;
  format: ProviderFormat;
  mtSlug?: string | null;
  hlsMtSlug?: string | null;
  aidSlug?: string | null;
}

export type { ProviderResult, ProviderPayload };
