export default (stage: string) => ({
  CopyrightApi: {
    Type: 'AWS::ApiGateway::RestApi',
    Properties: {
      Name: `${stage}-drm-api`,
      Description: 'Allow MediaPackage and MediaConvert services to reach out to the KeyOS MultiKey Services',
      EndpointConfiguration: {
        Types: ['EDGE'],
      },
      BinaryMediaTypes: ['*/*'],
    },
  },
  SpekeV1Resource: {
    Type: 'AWS::ApiGateway::Resource',
    Properties: {
      ParentId: {
        'Fn::GetAtt': ['CopyrightApi', 'RootResourceId'],
      },
      PathPart: 'v1',
      RestApiId: { Ref: 'CopyrightApi' },
    },
  },
  SpekeV2Resource: {
    Type: 'AWS::ApiGateway::Resource',
    Properties: {
      ParentId: {
        'Fn::GetAtt': ['CopyrightApi', 'RootResourceId'],
      },
      PathPart: 'v2',
      RestApiId: { Ref: 'CopyrightApi' },
    },
  },
  SpekeV2Method: {
    Type: 'AWS::ApiGateway::Method',
    Properties: {
      ResourceId: { Ref: 'SpekeV2Resource' },
      RestApiId: { Ref: 'CopyrightApi' },
      HttpMethod: 'POST',
      AuthorizationType: 'NONE',
      MethodResponses: [{
        StatusCode: 200,
      }],
      Integration: {
        IntegrationHttpMethod: 'POST',
        Type: 'HTTP_PROXY',
        Uri: 'https://speke.keyos.com/api/v2/getKeys',
      },
    },
  },
  SpekeV1Method: {
    Type: 'AWS::ApiGateway::Method',
    Properties: {
      ResourceId: { Ref: 'SpekeV1Resource' },
      RestApiId: { Ref: 'CopyrightApi' },
      HttpMethod: 'POST',
      AuthorizationType: 'NONE',
      MethodResponses: [{
        StatusCode: 200,
      }],
      Integration: {
        IntegrationHttpMethod: 'POST',
        Type: 'HTTP_PROXY',
        Uri: 'https://speke.keyos.com/api/v1/getKeys',
      },
    },
  },
  ApiCloudWatchRole: {
    Type: 'AWS::ApiGateway::Account',
    Properties: {
      CloudWatchRoleArn: { 'Fn::GetAtt': ['ApiGatewayCloudWatchLogsRole', 'Arn'] },
    },
  },
  ApiDeployment: {
    Type: 'AWS::ApiGateway::Deployment',
    DependsOn: ['SpekeV1Method', 'SpekeV2Method'],
    Properties: {
      RestApiId: { Ref: 'CopyrightApi' },
      StageDescription: {
        MetricsEnabled: true,
      },
      StageName: stage,
    },
  },
});
