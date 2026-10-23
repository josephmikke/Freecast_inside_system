import {
  LiveChannel, MediaTailorEndpoint, MediaTailorPlaylistType, Policies,
} from '../../shared/interfaces';
import { MAGIC_NUMBER } from '../../shared/variables';

export const getMediaTailorEndpoints = (
  endpointType: MediaTailorEndpoint,
  playlistType: MediaTailorPlaylistType,
  channels: LiveChannel[],
  policies: Policies,
) => channels.map((channel, index) => ({
  MinTTL: 0,
  MaxTTL: 0,
  PathPattern: {
    'Fn::Sub': ['/v1/${PlaylistType}/${EndpointUid}/${ChannelName}/*', {
      EndpointUid: {
        'Fn::Select': [5, {
          'Fn::Split': ['/', {
            'Fn::GetAtt': [`MediaTailorCampaign${index + MAGIC_NUMBER}`, endpointType],
          }],
        }],
      },
      ChannelName: channel.name,
      PlaylistType: playlistType,
    }],
  },
  OriginRequestPolicyId: policies.originRequestPolicyId,
  CachePolicyId: policies.cachePolicyId,
  TargetOriginId: channel.name,
  ViewerProtocolPolicy: 'redirect-to-https',
  AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
  ResponseHeadersPolicyId: policies.corsPolicyId,
}));

export const getMediaTailorAdSegments = (
  endpointType: MediaTailorEndpoint,
  segment: 'segment' | 'dashsegment',
  channels: LiveChannel[],
  policies: Policies,
) => channels.map((channel, index) => ({
  MinTTL: 0,
  MaxTTL: 0,
  PathPattern: {
    'Fn::Sub':
        ['/v1/${Segment}/${EndpointUid}/${ChannelName}/*', {
          EndpointUid: {
            'Fn::Select': [5, {
              'Fn::Split': ['/', {
                'Fn::GetAtt': [`MediaTailorCampaign${index + MAGIC_NUMBER}`, endpointType],
              }],
            }],
          },
          ChannelName: channel.name,
          Segment: segment,
        }],
  },
  OriginRequestPolicyId: policies.originRequestPolicyId,
  CachePolicyId: policies.cachePolicyId,
  TargetOriginId: channel.name,
  ViewerProtocolPolicy: 'redirect-to-https',
  AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
  ResponseHeadersPolicyId: policies.corsPolicyId,
}));

export const getMediaTailorOrigins = (channels: LiveChannel[]) => channels
  .map((channel, index) => ({
    DomainName: {
      'Fn::Select': [2, {
        'Fn::Split': ['/', {
          'Fn::GetAtt': [`MediaTailorCampaign${index + MAGIC_NUMBER}`, 'PlaybackEndpointPrefix'],
        }],
      }],
    },
    Id: channel.name,
    OriginCustomHeaders: [{
      HeaderName: 'X-MediaPackage-CDNIdentifier',
      HeaderValue: {
        'Fn::Sub': [
          '{{resolve:secretsmanager:${SecretId}:SecretString:MediaPackageCDNIdentifier}}',
          {
            SecretId: {
              'Fn::GetAtt': ['mediaPackageCDNAuthorizationSecret', 'Id'],
            },
          },
        ],
      },
    }],
    CustomOriginConfig: {
      HTTPPort: 80,
      HTTPSPort: 443,
      OriginProtocolPolicy: 'match-viewer',
      OriginSSLProtocols: ['TLSv1'],
    },
  }));

export default (channels: LiveChannel[]) => {
  const CACHING_OPTIMIZED_CACHE_POLICY_ID = '658327ea-f89d-4fab-a63d-7e88639e58f6';
  const CACHING_DISABLED_CACHE_POLICY_ID = '4135ea2d-6df8-44a3-9df3-4b5a84be39ad';
  const ALL_VIEWER_ORIGIN_REQUEST_POLICY_ID = '216adef6-5c7f-47e4-b989-5492eafa07d3';
  const CORS_WITH_PREFLIGHT_REQUEST_HEADER_POLICY_ID = '5cc3b908-e619-4b99-88e5-2cf7f45965bd';
  const policies: Policies = {
    cachePolicyId: CACHING_DISABLED_CACHE_POLICY_ID,
    originRequestPolicyId: ALL_VIEWER_ORIGIN_REQUEST_POLICY_ID,
    corsPolicyId: CORS_WITH_PREFLIGHT_REQUEST_HEADER_POLICY_ID,
  };

  return {
    MediaTailorDistribution: {
      Type: 'AWS::CloudFront::Distribution',
      Properties: {
        DistributionConfig: {
          HttpVersion: 'http2',
          Origins: [
            {
              DomainName: {
                'Fn::Sub': ['ads.mediatailor.${Region}.amazonaws.com', {
                  Region: { Ref: 'AWS::Region' },
                }],
              },
              Id: 'MediaTailor-Ads',
              OriginCustomHeaders: [{
                HeaderName: 'X-MediaPackage-CDNIdentifier',
                HeaderValue: {
                  'Fn::Sub': [
                    '{{resolve:secretsmanager:${SecretId}:SecretString:MediaPackageCDNIdentifier}}',
                    {
                      SecretId: {
                        'Fn::GetAtt': ['mediaPackageCDNAuthorizationSecret', 'Id'],
                      },
                    },
                  ],
                },
              }],
              CustomOriginConfig: {
                HTTPPort: 80,
                HTTPSPort: 443,
                OriginProtocolPolicy: 'match-viewer',
                OriginSSLProtocols: ['TLSv1'],
              },
            },
            {
              DomainName: {
                'Fn::Sub': ['segments.mediatailor.${Region}.amazonaws.com', {
                  Region: { Ref: 'AWS::Region' },
                }],
              },
              Id: 'MediaTailor-Ad-CDN',
              OriginCustomHeaders: [{
                HeaderName: 'X-MediaPackage-CDNIdentifier',
                HeaderValue: {
                  'Fn::Sub': [
                    '{{resolve:secretsmanager:${SecretId}:SecretString:MediaPackageCDNIdentifier}}',
                    {
                      SecretId: {
                        'Fn::GetAtt': ['mediaPackageCDNAuthorizationSecret', 'Id'],
                      },
                    },
                  ],
                },
              }],
              CustomOriginConfig: {
                HTTPPort: 80,
                HTTPSPort: 443,
                OriginProtocolPolicy: 'match-viewer',
                OriginSSLProtocols: ['TLSv1'],
              },
            },
            ...getMediaTailorOrigins(channels),
          ],
          CacheBehaviors: [
            {
              MinTTL: 0,
              MaxTTL: 0,
              PathPattern: '/tm/*',
              CachePolicyId: CACHING_OPTIMIZED_CACHE_POLICY_ID,
              TargetOriginId: 'MediaTailor-Ad-CDN',
              ViewerProtocolPolicy: 'redirect-to-https',
              AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
              ResponseHeadersPolicyId: policies.corsPolicyId,
            },
            ...getMediaTailorAdSegments(
              MediaTailorEndpoint.DASH_ManifestEndpointPrefix,
              'dashsegment',
              channels,
              {
                ...policies,
                cachePolicyId: CACHING_OPTIMIZED_CACHE_POLICY_ID,
              },
            ),
            ...getMediaTailorAdSegments(
              MediaTailorEndpoint.HLS_ManifestEndpointPrefix,
              'segment',
              channels,
              {
                ...policies,
                cachePolicyId: CACHING_OPTIMIZED_CACHE_POLICY_ID,
              },
            ),
            ...getMediaTailorEndpoints(
              MediaTailorEndpoint.DASH_ManifestEndpointPrefix,
              MediaTailorPlaylistType.DASH,
              channels,
              policies,
            ),
            ...getMediaTailorEndpoints(
              MediaTailorEndpoint.HLS_ManifestEndpointPrefix,
              MediaTailorPlaylistType.HLS_MANIFEST,
              channels,
              policies,
            ),
            ...getMediaTailorEndpoints(
              MediaTailorEndpoint.HLS_ManifestEndpointPrefix,
              MediaTailorPlaylistType.HLS_MASTER,
              channels,
              policies,
            ),
          ],
          Comment: 'CloudFront Distribution for MediaTailor Configurations',
          Enabled: true,
          PriceClass: 'PriceClass_All',
          DefaultCacheBehavior: {
            MinTTL: 0,
            MaxTTL: 0,
            TargetOriginId: 'MediaTailor-Ads',
            AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
            ViewerProtocolPolicy: 'redirect-to-https',
            CachePolicyId: CACHING_OPTIMIZED_CACHE_POLICY_ID,
          },
          CustomErrorResponses: [{
            ErrorCode: 400,
            ErrorCachingMinTTL: 1,
          }, {
            ErrorCode: 403,
            ErrorCachingMinTTL: 1,
          }, {
            ErrorCode: 404,
            ErrorCachingMinTTL: 1,
          }, {
            ErrorCode: 405,
            ErrorCachingMinTTL: 1,
          }, {
            ErrorCode: 414,
            ErrorCachingMinTTL: 1,
          }, {
            ErrorCode: 416,
            ErrorCachingMinTTL: 1,
          }, {
            ErrorCode: 500,
            ErrorCachingMinTTL: 1,
          }, {
            ErrorCode: 501,
            ErrorCachingMinTTL: 1,
          }, {
            ErrorCode: 502,
            ErrorCachingMinTTL: 1,
          }, {
            ErrorCode: 503,
            ErrorCachingMinTTL: 1,
          }],
        },
      },
    },
  };
};
