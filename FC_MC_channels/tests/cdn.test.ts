import { getMediaPackageOriginEndpoints, getMediaPackageOrigins } from '../broadcast/cdn/cdn-media-package';
import {
  MediaPackageEndpoint, MediaTailorEndpoint, MediaTailorPlaylistType, Policies,
} from '../shared/interfaces';
import { getMediaTailorEndpoints } from '../broadcast/cdn/cdn-media-tailor';

const channels = [
  { name: 'United_Teleport_Mis_Canales_A3Series', az: 0 },
  { name: 'United_Teleport_Mis_Canales_Antenna_3', az: 1 },
];

const policies: Policies = {
  cachePolicyId: 'cache',
  originRequestPolicyId: 'origin',
  corsPolicyId: 'cors',
};

describe('getMediaPackageOriginEndpoints', () => {
  it('Generate outputs for HLS endpoints', () => {
    const expected = [
      {
        MinTTL: 6,
        PathPattern: {
          'Fn::Sub':
                        ['/${EndpointUid}/*', {
                          EndpointUid: {
                            'Fn::Select': [5, {
                              'Fn::Split': ['/', {
                                'Fn::GetAtt': ['MediaPackagePackageHLSEndpoint0', 'Url'],
                              }],
                            }],
                          },
                        }],
        },
        OriginRequestPolicyId: 'origin',
        CachePolicyId: 'cache',
        TargetOriginId: 'United_Teleport_Mis_Canales_A3Series',
        ViewerProtocolPolicy: 'redirect-to-https',
        AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        ResponseHeadersPolicyId: 'cors',
      },
      {
        MinTTL: 6,
        PathPattern: {
          'Fn::Sub':
                        ['/${EndpointUid}/*', {
                          EndpointUid: {
                            'Fn::Select': [5, {
                              'Fn::Split': ['/', {
                                'Fn::GetAtt': ['MediaPackagePackageHLSEndpoint1', 'Url'],
                              }],
                            }],
                          },
                        }],
        },
        OriginRequestPolicyId: 'origin',
        CachePolicyId: 'cache',
        TargetOriginId: 'United_Teleport_Mis_Canales_Antenna_3',
        ViewerProtocolPolicy: 'redirect-to-https',
        AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        ResponseHeadersPolicyId: 'cors',
      },
    ];
    expect(getMediaPackageOriginEndpoints(
      MediaPackageEndpoint.MediaPackagePackageHLSEndpoint,
      channels,
      policies,
    )).toEqual(expected);
  });
});

describe('getMediaPackageOrigins', () => {
  it('should return MediaPackage Origin', () => {
    const expected = [{
      DomainName: {
        'Fn::Select': [2, {
          'Fn::Split': ['/', {
            'Fn::GetAtt': ['MediaPackagePackageHLSEndpoint0', 'Url'],
          }],
        }],
      },
      Id: 'United_Teleport_Mis_Canales_A3Series',
      OriginPath: '/out/v1',
      CustomOriginConfig: {
        HTTPPort: 80,
        HTTPSPort: 443,
        OriginProtocolPolicy: 'match-viewer',
        OriginSSLProtocols: ['TLSv1'],
      },
    }, {
      DomainName: {
        'Fn::Select': [2, {
          'Fn::Split': ['/', {
            'Fn::GetAtt': ['MediaPackagePackageHLSEndpoint1', 'Url'],
          }],
        }],
      },
      Id: 'United_Teleport_Mis_Canales_Antenna_3',
      OriginPath: '/out/v1',
      CustomOriginConfig: {
        HTTPPort: 80,
        HTTPSPort: 443,
        OriginProtocolPolicy: 'match-viewer',
        OriginSSLProtocols: ['TLSv1'],
      },
    }];
    expect(getMediaPackageOrigins(channels)).toEqual(expected);
  });
});

describe('getMediaTailorEndpoints', () => {
  it('should return MediaTailor DASH endpoints', () => {
    const expected = [{
      MinTTL: 0,
      MaxTTL: 0,
      PathPattern: {
        'Fn::Sub':
                    ['/v1/${PlaylistType}/${EndpointUid}/${ChannelName}/*', {
                      EndpointUid: {
                        'Fn::Select': [5, {
                          'Fn::Split': ['/', {
                            'Fn::GetAtt': ['MediaTailorCampaign0', 'DashConfiguration.ManifestEndpointPrefix'],
                          }],
                        }],
                      },
                      ChannelName: 'United_Teleport_Mis_Canales_A3Series',
                      PlaylistType: 'dash',
                    }],
      },
      OriginRequestPolicyId: 'origin',
      CachePolicyId: 'cache',
      TargetOriginId: 'United_Teleport_Mis_Canales_A3Series',
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      ResponseHeadersPolicyId: 'cors',
    },
    {
      MinTTL: 0,
      MaxTTL: 0,
      PathPattern: {
        'Fn::Sub':
                        ['/v1/${PlaylistType}/${EndpointUid}/${ChannelName}/*', {
                          EndpointUid: {
                            'Fn::Select': [5, {
                              'Fn::Split': ['/', {
                                'Fn::GetAtt': ['MediaTailorCampaign1', 'DashConfiguration.ManifestEndpointPrefix'],
                              }],
                            }],
                          },
                          ChannelName: 'United_Teleport_Mis_Canales_Antenna_3',
                          PlaylistType: 'dash',
                        }],
      },
      OriginRequestPolicyId: 'origin',
      CachePolicyId: 'cache',
      TargetOriginId: 'United_Teleport_Mis_Canales_Antenna_3',
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      ResponseHeadersPolicyId: 'cors',
    }];

    expect(getMediaTailorEndpoints(
      MediaTailorEndpoint.DASH_ManifestEndpointPrefix,
      MediaTailorPlaylistType.DASH,
      channels,
      policies,
    )).toEqual(expected);
  });

  it('should return MediaTailor HLS endpoints', () => {
    const expected = [{
      MinTTL: 0,
      MaxTTL: 0,
      PathPattern: {
        'Fn::Sub':
                    ['/v1/${PlaylistType}/${EndpointUid}/${ChannelName}/*', {
                      EndpointUid: {
                        'Fn::Select': [5, {
                          'Fn::Split': ['/', {
                            'Fn::GetAtt': ['MediaTailorCampaign0', 'HlsConfiguration.ManifestEndpointPrefix'],
                          }],
                        }],
                      },
                      ChannelName: 'United_Teleport_Mis_Canales_A3Series',
                      PlaylistType: 'manifest',
                    }],
      },
      OriginRequestPolicyId: 'origin',
      CachePolicyId: 'cache',
      TargetOriginId: 'United_Teleport_Mis_Canales_A3Series',
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      ResponseHeadersPolicyId: 'cors',
    },
    {
      MinTTL: 0,
      MaxTTL: 0,
      PathPattern: {
        'Fn::Sub':
                        ['/v1/${PlaylistType}/${EndpointUid}/${ChannelName}/*', {
                          EndpointUid: {
                            'Fn::Select': [5, {
                              'Fn::Split': ['/', {
                                'Fn::GetAtt': ['MediaTailorCampaign1', 'HlsConfiguration.ManifestEndpointPrefix'],
                              }],
                            }],
                          },
                          ChannelName: 'United_Teleport_Mis_Canales_Antenna_3',
                          PlaylistType: 'manifest',
                        }],
      },
      OriginRequestPolicyId: 'origin',
      CachePolicyId: 'cache',
      TargetOriginId: 'United_Teleport_Mis_Canales_Antenna_3',
      ViewerProtocolPolicy: 'redirect-to-https',
      AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
      ResponseHeadersPolicyId: 'cors',
    }];

    expect(getMediaTailorEndpoints(
      MediaTailorEndpoint.HLS_ManifestEndpointPrefix,
      MediaTailorPlaylistType.HLS_MANIFEST,
      channels,
      policies,
    )).toEqual(expected);
  });
});
