import { LiveChannel, MediaPackageEndpoint, Policies } from '../../shared/interfaces';
import { MAGIC_NUMBER } from '../../shared/variables';

export const getMediaPackageOriginEndpoints = (
  type: MediaPackageEndpoint,
  channels: LiveChannel[],
  policies: Policies,
  init?: boolean,
) => channels.map((channel, index) => ({
  MinTTL: 6,
  PathPattern: {
    'Fn::Sub': [init ? '/${EndpointUid}/*_init.mp4' : '/${EndpointUid}/*', {
      EndpointUid: {
        'Fn::Select': [5, {
          'Fn::Split': ['/', {
            'Fn::GetAtt': [`${type}${index + MAGIC_NUMBER}`, 'Url'],
          }],
        }],
      },
    }],
  },
  OriginRequestPolicyId: policies.originRequestPolicyId,
  CachePolicyId: init ? policies.initPolicyId : policies.cachePolicyId,
  TargetOriginId: channel.name,
  ViewerProtocolPolicy: 'redirect-to-https',
  AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
  ResponseHeadersPolicyId: policies.corsPolicyId,
}));

export const getMediaPackageOrigins = (channels: LiveChannel[]) => channels
  .map((channel, index) => ({
    DomainName: {
      'Fn::Select': [2, {
        'Fn::Split': ['/', {
          'Fn::GetAtt': [`MediaPackagePackageHLSEndpoint${index + MAGIC_NUMBER}`, 'Url'],
        }],
      }],
    },
    Id: channel.name,
    OriginPath: '/out/v1',
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
  const MEDIAPACKAGE_CACHE_POLICY_ID = '08627262-05a9-4f76-9ded-b50ca2e3a84f';
  const ALL_VIEWER_ORIGIN_REQUEST_POLICY_ID = '216adef6-5c7f-47e4-b989-5492eafa07d3';
  const CORS_WITH_PREFLIGHT_REQUEST_HEADER_POLICY_ID = '5cc3b908-e619-4b99-88e5-2cf7f45965bd';
  const CUSTOM_MEDIAPACKAGE_21600 = '64aba576-cd7d-435e-aac7-64912d4edcd0';
  const policies: Policies = {
    cachePolicyId: MEDIAPACKAGE_CACHE_POLICY_ID,
    originRequestPolicyId: ALL_VIEWER_ORIGIN_REQUEST_POLICY_ID,
    corsPolicyId: CORS_WITH_PREFLIGHT_REQUEST_HEADER_POLICY_ID,
    initPolicyId: CUSTOM_MEDIAPACKAGE_21600,
  };

  return {
    LiveChannelDistribution: {
      Type: 'AWS::CloudFront::Distribution',
      Properties: {
        DistributionConfig: {
          WebACLId: '${param:wafArn}',
          HttpVersion: 'http2',
          Origins: [
            {
              DomainName: 'mediapackage.amazonaws.com',
              Id: 'TEMP_ORIGIN_ID/channel',
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
            ...getMediaPackageOrigins(channels),
          ],
          CacheBehaviors: [
            ...getMediaPackageOriginEndpoints(
              MediaPackageEndpoint.MediaPackagePackageDASHEndpoint,
              channels,
              policies,
            ),
            ...getMediaPackageOriginEndpoints(
              MediaPackageEndpoint.MediaPackagePackageDASHEncryptedEndpoint,
              channels,
              policies,
              true,
            ),
            ...getMediaPackageOriginEndpoints(
              MediaPackageEndpoint.MediaPackagePackageDASHEncryptedEndpoint,
              channels,
              policies,
            ),
            ...getMediaPackageOriginEndpoints(
              MediaPackageEndpoint.MediaPackagePackageHLSEndpoint,
              channels,
              policies,
            ),
            ...getMediaPackageOriginEndpoints(
              MediaPackageEndpoint.MediaPackagePackageHLSEncryptedEndpoint,
              channels,
              policies,
            ),
          ],
          Comment: 'CloudFront Distribution for MediaPackage channels',
          Enabled: true,
          PriceClass: 'PriceClass_All',
          DefaultCacheBehavior: {
            MinTTL: 6,
            MaxTTL: 60,
            TargetOriginId: 'TEMP_ORIGIN_ID/channel',
            AllowedMethods: ['GET', 'HEAD', 'OPTIONS'],
            ViewerProtocolPolicy: 'redirect-to-https',
            CachePolicyId: MEDIAPACKAGE_CACHE_POLICY_ID,
            OriginRequestPolicyId: ALL_VIEWER_ORIGIN_REQUEST_POLICY_ID,
            ResponseHeadersPolicyId: CORS_WITH_PREFLIGHT_REQUEST_HEADER_POLICY_ID,
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
