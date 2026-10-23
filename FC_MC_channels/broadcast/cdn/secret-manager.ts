export default () => ({
  mediaPackageCDNAuthorizationSecret: {
    Type: 'AWS::SecretsManager::Secret',
    Properties: {
      Description: 'MediaPackageCDNIdentifier secret for ${sls:stage}',
      Name: 'MediaPackageCDNIdentifier-Live-${sls:stage}',
      GenerateSecretString: {
        SecretStringTemplate: '{}',
        GenerateStringKey: 'MediaPackageCDNIdentifier',
        PasswordLength: 30,
        ExcludePunctuation: true,
      },
      Tags: [
        {
          Key: 'map-migrated',
          Value: 'd-server-03ldkhdk7ade4y',
        },
      ],
    },
  },
});
