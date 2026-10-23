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
              'mediapackage.amazonaws.com',
            ],
          },
          Action: [
            'sts:AssumeRole',
          ],
        },
      ],
    },
    Path: '/',
    Policies: [
      {
        PolicyName: 'MediaPackageInvokeApi',
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'execute-api:Invoke',
              ],
              Resource: [{
                'Fn::Join': ['',
                  [
                    'arn:aws:execute-api:',
                    { Ref: 'AWS::Region' },
                    ':',
                    { Ref: 'AWS::AccountId' },
                    ':${param:restApiId}/*/POST/v1',
                  ],
                ],
              }, {
                'Fn::Join': ['',
                  [
                    'arn:aws:execute-api:',
                    { Ref: 'AWS::Region' },
                    ':',
                    { Ref: 'AWS::AccountId' },
                    ':${param:restApiId}/*/POST/v2',
                  ],
                ],
              }],
            },
          ],
        },
      },
    ],
  },
};
