import { LiveChannel } from '../../shared/interfaces';
import { MAGIC_NUMBER } from '../../shared/variables';

export default (channels: LiveChannel[], certificateArn: string) => {
  const regex = /^[a-zA-Z0-9_-]*$/;
  const FIRST_CHANNEL = 1;
  return channels.reduce(
    (curr, channel, index) => {
      if (!regex.test(channel.name)) throw new Error(`Invalid channel name ${channel.name}. Valid characters: A-Z, a-z, _- and 0-9`);
      return {
        ...curr,
        [`MediaPackageChannel${index + MAGIC_NUMBER}`]: {
          ...((index >= FIRST_CHANNEL) && { DependsOn: `MediaPackageChannel${index + MAGIC_NUMBER - 1}` }),
          Type: 'AWS::MediaPackage::Channel',
          Properties: {
            Id: channel.name,
            Description: `Media Package channel for ${channel.name}`,
            Tags: [
              {
                Key: 'map-migrated',
                Value: 'd-server-03ldkhdk7ade4y',
              },
            ],
          },
        },
        [`MediaPackagePackageHLSEndpoint${index + MAGIC_NUMBER}`]: {
          Type: 'AWS::MediaPackage::OriginEndpoint',
          Properties: {
            Authorization: {
              CdnIdentifierSecret: {
                'Fn::GetAtt': ['mediaPackageCDNAuthorizationSecret', 'Id'],
              },
              SecretsRoleArn: { 'Fn::GetAtt': ['MediaPackageASM', 'Arn'] },
            },
            ChannelId: channel.name,
            StartoverWindowSeconds: 1209600, // 14 days (max)
            HlsPackage: {
              AdMarkers: 'SCTE35_ENHANCED',
            },
            Id: `HLS_${channel.name}`,
            Tags: [
              {
                Key: 'map-migrated',
                Value: 'd-server-03ldkhdk7ade4y',
              },
            ],
          },
          DependsOn: `MediaPackageChannel${index + MAGIC_NUMBER}`,
        },
        [`MediaPackagePackageDASHEndpoint${index + MAGIC_NUMBER}`]: {
          Type: 'AWS::MediaPackage::OriginEndpoint',
          Properties: {
            Authorization: {
              CdnIdentifierSecret: {
                'Fn::GetAtt': ['mediaPackageCDNAuthorizationSecret', 'Id'],
              },
              SecretsRoleArn: { 'Fn::GetAtt': ['MediaPackageASM', 'Arn'] },
            },
            ChannelId: channel.name,
            StartoverWindowSeconds: 1209600, // 14 days (max)
            DashPackage: {
              PeriodTriggers: ['ADS'],
            },
            Id: `DASH_${channel.name}`,
            Tags: [
              {
                Key: 'map-migrated',
                Value: 'd-server-03ldkhdk7ade4y',
              },
            ],
          },
          DependsOn: `MediaPackageChannel${index + MAGIC_NUMBER}`,
        },
        [`MediaPackagePackageDASHEncryptedEndpoint${index + MAGIC_NUMBER}`]: {
          Type: 'AWS::MediaPackage::OriginEndpoint',
          Properties: {
            Authorization: {
              CdnIdentifierSecret: {
                'Fn::GetAtt': ['mediaPackageCDNAuthorizationSecret', 'Id'],
              },
              SecretsRoleArn: { 'Fn::GetAtt': ['MediaPackageASM', 'Arn'] },
            },
            ChannelId: channel.name,
            StartoverWindowSeconds: 1209600, // 14 days (max)
            DashPackage: {
              PeriodTriggers: ['ADS'],
              Encryption: {
                KeyRotationIntervalSeconds: 0,
                SpekeKeyProvider: {
                  CertificateArn: certificateArn,
                  EncryptionContractConfiguration: {
                    PresetSpeke20Audio: 'SHARED',
                    PresetSpeke20Video: 'SHARED',
                  },
                  ResourceId: `DASH_${channel.name}_Encrypted`,
                  RoleArn: { 'Fn::GetAtt': ['MediaPackageInvokeApiRole', 'Arn'] },
                  SystemIds: ['edef8ba9-79d6-4ace-a3c8-27dcd51d21ed'], // TODO: check for maps
                  Url: '${param:apiEndpoint}/v2',
                },
              },
            },
            Id: `DASH_${channel.name}_Encrypted`,
            Tags: [
              {
                Key: 'map-migrated',
                Value: 'd-server-03ldkhdk7ade4y',
              },
            ],
          },
          DependsOn: `MediaPackageChannel${index + MAGIC_NUMBER}`,
        },
        [`MediaPackagePackageHLSEncryptedEndpoint${index + MAGIC_NUMBER}`]: {
          Type: 'AWS::MediaPackage::OriginEndpoint',
          Properties: {
            Authorization: {
              CdnIdentifierSecret: {
                'Fn::GetAtt': ['mediaPackageCDNAuthorizationSecret', 'Id'],
              },
              SecretsRoleArn: { 'Fn::GetAtt': ['MediaPackageASM', 'Arn'] },
            },
            ChannelId: channel.name,
            StartoverWindowSeconds: 1209600, // 14 days (max)
            HlsPackage: {
              AdMarkers: 'SCTE35_ENHANCED',
              Encryption: {
                EncryptionMethod: 'SAMPLE_AES',
                KeyRotationIntervalSeconds: 0,
                RepeatExtXKey: true,
                SpekeKeyProvider: {
                  CertificateArn: certificateArn,
                  ResourceId: `HLS_${channel.name}_Encrypted`,
                  RoleArn: { 'Fn::GetAtt': ['MediaPackageInvokeApiRole', 'Arn'] },
                  SystemIds: ['94ce86fb-07ff-4f43-adb8-93d2fa968ca2'], // TODO: check for maps
                  Url: '${param:apiEndpoint}/v1',
                },
              },
            },
            Id: `HLS_${channel.name}_Encrypted`,
            Tags: [
              {
                Key: 'map-migrated',
                Value: 'd-server-03ldkhdk7ade4y',
              },
            ],
          },
          DependsOn: `MediaPackageChannel${index + MAGIC_NUMBER}`,
        },
      };
    },
    {},
  );
};
