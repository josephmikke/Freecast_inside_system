import { AWS } from '@serverless/typescript';

const serverlessConfiguration: AWS = {
  service: 'waf',
  frameworkVersion: '3',
  provider: {
    name: 'aws',
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
  },
  resources: {
    Resources: {
      WAFWebACL: {
        Type: 'AWS::WAFv2::WebACL',
        Properties: {
          Description: 'Access Control List for MediaPackage CloudFront distribution',
          DefaultAction: {
            Block: {},
          },
          Name: '${sls:stage}-DistributionACL',
          VisibilityConfig: {
            SampledRequestsEnabled: true,
            CloudWatchMetricsEnabled: true,
            MetricName: '${sls:stage}-DistributionACL',
          },
          Scope: 'CLOUDFRONT',
          Tags: [{
            Key: 'map-migrated',
            Value: 'd-server-03ldkhdk7ade4y',
          }],
        },
      },
    },
    Outputs: {
      WAFWebACLArn: {
        Description: 'WAFWebACLArn',
        Value: { 'Fn::GetAtt': ['WAFWebACL', 'Arn'] },
      },
    },
  },
};

module.exports = serverlessConfiguration;
