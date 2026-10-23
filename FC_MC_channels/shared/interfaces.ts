export enum Mode {
  SRT_CALLER = 'SRT_CALLER',
  SRT_LISTENER = 'SRT_LISTENER',
  HLS = 'HLS',
}

export interface LiveChannel {
  name: string;
  az: number;
  mode: Mode
  url?: string;
  sourceListenerAddress?: string;
  sourceListenerPort?: number;
}

export interface Policies {
  corsPolicyId: string,
  cachePolicyId: string,
  originRequestPolicyId: string
  initPolicyId?: string
}

export enum MediaPackageEndpoint {
  MediaPackagePackageHLSEndpoint = 'MediaPackagePackageHLSEndpoint',
  MediaPackagePackageDASHEndpoint = 'MediaPackagePackageDASHEndpoint',
  MediaPackagePackageDASHEncryptedEndpoint = 'MediaPackagePackageDASHEncryptedEndpoint',
  MediaPackagePackageHLSEncryptedEndpoint = 'MediaPackagePackageHLSEncryptedEndpoint',
}

export enum MediaTailorEndpoint {
  DASH_ManifestEndpointPrefix = 'DashConfiguration.ManifestEndpointPrefix',
  HLS_ManifestEndpointPrefix = 'HlsConfiguration.ManifestEndpointPrefix',
}

export enum MediaTailorPlaylistType {
  HLS_MASTER = 'master',
  HLS_MANIFEST = 'manifest',
  DASH = 'dash',
}
