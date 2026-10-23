import type { AWS } from '@serverless/typescript';
import copyrightApi from './api-gateway';
import apiGatewayCloudWatchLogsRole from '../shared/api-gateway-cloudwatch-role';

const serverlessConfiguration: AWS = {
  service: 'drm-api',
  frameworkVersion: '3',
  package: {
    individually: true,
    patterns: [
      'authXML/**',
      'proxy/**',
    ],
  },
  provider: {
    name: 'aws',
    runtime: 'nodejs22.x',
    region: 'us-east-1',
    deploymentMethod: 'direct',
    tags: {
      project: 'freecast-live',
      'map-migrated': 'd-server-03ldkhdk7ade4y',
    },
    stackTags: {
      project: 'freecast-live',
      'map-migrated': 'd-server-03ldkhdk7ade4y',
    },
    apiGateway: {
      restApiId: { Ref: 'CopyrightApi' },
      restApiRootResourceId: {
        'Fn::GetAtt': ['CopyrightApi', 'RootResourceId'],
      },
      apiKeys: [
        'licence-acquisition-${sls:stage}',
      ],
    },
    environment: {
      NODE_OPTIONS: '--enable-source-maps',
      SECRET_NAME: 'keyos-signing-key',
      PRIVATE_KEY_SSM_NAME: 'keyos-signing-key',
      PRIVATE_KEY_ID_SSM_NAME: 'keyos-key-id',
      PUBKEY_ID: '7a03380462f42dd14782db3c0f62e131',
      FP_PUB_CERT_URL: 'https://fairplay.keyos.com/api/v4/getCertificate?certHash=1774c8373b628c86fc80388b36f63a48',
    },
    iam: {
      role: {
        statements: [{
          Effect: 'Allow',
          Action: 'secretsmanager:GetSecretValue',
          Resource: [
            'arn:aws:secretsmanager:us-east-1:199718138082:secret:keyos-key-id-vSTW4w',
            'arn:aws:secretsmanager:us-east-1:199718138082:secret:keyos-signing-key-s3mKrD',
          ],
        }],
      },
    },
  },
  plugins: [
    'serverless-esbuild',
    'serverless-python-requirements',
  ],
  custom: {
    esbuild: {
      bundle: true,
      minify: true,
      sourcemap: true,
    },
    pythonRequirements: {
      dockerizePip: true,
      dockerImage: 'public.ecr.aws/sam/build-python3.12:1.142.1-20250701194731',
      pythonBin: 'python3',
    },
  },
  functions: {
    authXML: {
      handler: 'authXML/index.default',
      events: [{
        http: {
          path: 'auth-xml-generator',
          method: 'GET',
          cors: true,
          private: true,
        },
      }],
    },
    proxy: {
      handler: 'lambda_function.lambda_handler',
      // @ts-ignore
      module: 'proxy',
      runtime: 'python3.12',
      timeout: 30,
      events: [{
        http: {
          path: '/drm',
          method: 'POST',
          cors: true,
        },
      }],
    },
  },
  resources: {
    Resources: {
      ApiGatewayCloudWatchLogsRole: apiGatewayCloudWatchLogsRole,
      ...copyrightApi('${sls:stage}'),
    },
    Outputs: {
      RestApiId: {
        Description: 'RestApiId',
        Value: { Ref: 'CopyrightApi' },
      },
      ApiEndpoint: {
        Description: 'RestApiId',
        Value: {
          'Fn::Join': ['',
            [
              'https://',
              { Ref: 'CopyrightApi' },
              '.execute-api.',
              { Ref: 'AWS::Region' },
              '.amazonaws.com/${sls:stage}',
            ],
          ],
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
