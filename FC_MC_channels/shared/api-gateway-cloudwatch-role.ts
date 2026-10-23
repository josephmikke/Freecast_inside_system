// Allows API Gateway to push logs to CloudWatch Logs.

export default {
  Type: 'AWS::IAM::Role',
  Properties: {
    AssumeRolePolicyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: {
            Service: [
              'apigateway.amazonaws.com',
            ],
          },
          Action: [
            'sts:AssumeRole',
          ],
        },
      ],
    },
    Path: '/',
    ManagedPolicyArns: [
      'arn:aws:iam::aws:policy/service-role/AmazonAPIGatewayPushToCloudWatchLogs',
    ],
  },
};
