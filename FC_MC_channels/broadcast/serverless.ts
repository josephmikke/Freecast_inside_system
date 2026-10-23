import type { AWS } from '@serverless/typescript';
import getMediaConnectFlowDefinition from './live-channels/media-connect';
import getMediaPackageChannelDefinition from './live-channels/media-package';
import getMediaLiveInputDefinition from './live-channels/media-live';
import getMediaTailorDefinition from './live-channels/media-tailor';
import getMediaPackageCloudFrontDefinition from './cdn/cdn-media-package';
import getMediaTailorCloudFrontDefinition from './cdn/cdn-media-tailor';
import mediaLiveAccessRole from '../shared/media-live-access-role';
import mediaPackageInvokeApiRole from '../shared/media-package-role';
import {
  CERTIFICATE_ARN_DEV, CERTIFICATE_ARN_PROD, LIVE_CHANNELS, MEDIATAILOR_ADS_URL,
} from '../shared/variables';
import secretManager from './cdn/secret-manager';

const serverlessConfiguration: AWS = {
  service: 'live-pipeline',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
    region: 'us-east-1',
    runtime: 'nodejs22.x',
    deploymentMethod: 'direct',
    tags: {
      project: 'freecast-live',
      'map-migrated': 'd-server-03ldkhdk7ade4y',
    },
    stackTags: {
      project: 'freecast-live',
      'map-migrated': 'd-server-03ldkhdk7ade4y',
    },
    iam: {
      role: {
        statements: [{
          Effect: 'Allow',
          Action: 'mediatailor:*',
          Resource: '*',
        }],
      },
    },
  },
  plugins: [
    'serverless-esbuild',
  ],
  custom: {
    CERTIFICATE_ARN: {
      dev: CERTIFICATE_ARN_DEV,
      prod: CERTIFICATE_ARN_PROD,
    },
    esbuild: {
      bundle: true,
      minify: true,
      sourcemap: true,
    },
  },
  functions: {
    mediaTailorCustomResource: {
      handler: 'live-channels/media-tailor-custom-resource.default',
      name: '${sls:stage}-mediatailorCustomResource',
      description: 'Custom resource used to configure CDN settings',
      environment: {
        STAGE: '${sls:stage}',
        PROJECT: 'freecast-live',
      },
    },
  },
  resources: {
    Resources: {
      MediaLiveAccessRole: mediaLiveAccessRole,
      MediaPackageInvokeApiRole: mediaPackageInvokeApiRole,
      ...getMediaConnectFlowDefinition(LIVE_CHANNELS),
      ...getMediaPackageChannelDefinition(LIVE_CHANNELS, '${self:custom.CERTIFICATE_ARN.${sls:stage}}'),
      ...getMediaLiveInputDefinition(LIVE_CHANNELS),
      ...getMediaTailorDefinition(LIVE_CHANNELS, MEDIATAILOR_ADS_URL),
      ...getMediaPackageCloudFrontDefinition(LIVE_CHANNELS),
      ...getMediaTailorCloudFrontDefinition(LIVE_CHANNELS),
      ...secretManager(),
      MediaTailorCustomResource: {
        Type: 'Custom::MediaTailor',
        Properties: {
          ExecutionTime: new Date(),
          ServiceToken: { 'Fn::GetAtt': ['MediaTailorCustomResourceLambdaFunction', 'Arn'] },
          Region: { Ref: 'AWS::Region' },
          SegmentCDN: { 'Fn::GetAtt': ['LiveChannelDistribution', 'DomainName'] },
          AdCDN: { 'Fn::GetAtt': ['MediaTailorDistribution', 'DomainName'] },
        },
      },
      MediaPackageASM: {
        Type: 'AWS::IAM::Role',
        Properties: {
          RoleName: '${sls:stage}-Live-MediaPackageASM',
          AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [{
              Effect: 'Allow',
              Principal: {
                Service: 'mediapackage.amazonaws.com',
              },
              Action: [
                'sts:AssumeRole',
              ],
            }],
          },
          Path: '/',
          Policies: [{
            PolicyName: '${sls:stage}-SecretsManagerForMediaPackage',
            PolicyDocument: {
              Version: '2012-10-17',
              Statement: [
                {
                  Effect: 'Allow',
                  Action: [
                    'secretsmanager:GetResourcePolicy',
                    'secretsmanager:GetSecretValue',
                    'secretsmanager:DescribeSecret',
                    'secretsmanager:ListSecretVersionId',
                  ],
                  Resource: '*',
                },
              ],
            },
          }],
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
