import getMediaPackageChannelDefinition from '../broadcast/live-channels/media-package';

const channels = [
  { name: 'test1', az: 0 },
];

const invalidChannel = [
  { name: 'test+', az: 0 },
];

const expectations = {
  MediaPackageChannel0: {
    Type: 'AWS::MediaPackage::Channel',
    Properties: {
      Id: 'test1',
      Tags: [{
        Key: 'map-migrated',
        Value: 'd-server-03ldkhdk7ade4y',
      }],
      Description: 'Media Package channel for test1',
    },
  },
  MediaPackagePackageHLSEndpoint0: {
    Type: 'AWS::MediaPackage::OriginEndpoint',
    Properties: {
      ChannelId: 'test1',
      HlsPackage: {
        AdMarkers: 'SCTE35_ENHANCED',
      },
      Id: 'HLS_test1',
      StartoverWindowSeconds: 1209600,
      Tags: [{
        Key: 'map-migrated',
        Value: 'd-server-03ldkhdk7ade4y',
      }],
    },
    DependsOn: 'MediaPackageChannel0',
  },
  MediaPackagePackageDASHEndpoint0: {
    Type: 'AWS::MediaPackage::OriginEndpoint',
    Properties: {
      ChannelId: 'test1',
      DashPackage: {
        PeriodTriggers: ['ADS'],
      },
      Id: 'DASH_test1',
      StartoverWindowSeconds: 1209600,
      Tags: [{
        Key: 'map-migrated',
        Value: 'd-server-03ldkhdk7ade4y',
      }],
    },
    DependsOn: 'MediaPackageChannel0',
  },
  MediaPackagePackageDASHEncryptedEndpoint0: {
    DependsOn: 'MediaPackageChannel0',
    Properties: {
      ChannelId: 'test1',
      DashPackage: {
        Encryption: {
          KeyRotationIntervalSeconds: 0,
          SpekeKeyProvider: {
            CertificateArn: 'arn',
            EncryptionContractConfiguration: {
              PresetSpeke20Audio: 'SHARED',
              PresetSpeke20Video: 'SHARED',
            },
            ResourceId: 'DASH_test1_Encrypted',
            RoleArn: {
              'Fn::GetAtt': [
                'MediaPackageInvokeApiRole',
                'Arn',
              ],
            },
            SystemIds: [
              'edef8ba9-79d6-4ace-a3c8-27dcd51d21ed',
            ],
            Url: '${param:apiEndpoint}/v2',
          },
        },
        PeriodTriggers: [
          'ADS',
        ],
      },
      Id: 'DASH_test1_Encrypted',
      StartoverWindowSeconds: 1209600,
      Tags: [{
        Key: 'map-migrated',
        Value: 'd-server-03ldkhdk7ade4y',
      }],
    },
    Type: 'AWS::MediaPackage::OriginEndpoint',
  },
  MediaPackagePackageHLSEncryptedEndpoint0: {
    DependsOn: 'MediaPackageChannel0',
    Properties: {
      ChannelId: 'test1',
      HlsPackage: {
        AdMarkers: 'SCTE35_ENHANCED',
        Encryption: {
          EncryptionMethod: 'SAMPLE_AES',
          KeyRotationIntervalSeconds: 0,
          RepeatExtXKey: true,
          SpekeKeyProvider: {
            CertificateArn: 'arn',
            ResourceId: 'HLS_test1_Encrypted',
            RoleArn: {
              'Fn::GetAtt': [
                'MediaPackageInvokeApiRole',
                'Arn',
              ],
            },
            SystemIds: [
              '94ce86fb-07ff-4f43-adb8-93d2fa968ca2',
            ],
            Url: '${param:apiEndpoint}/v1',
          },
        },
      },
      Id: 'HLS_test1_Encrypted',
      StartoverWindowSeconds: 1209600,
      Tags: [{
        Key: 'map-migrated',
        Value: 'd-server-03ldkhdk7ade4y',
      }],
    },
    Type: 'AWS::MediaPackage::OriginEndpoint',
  },

};

describe('getMediaPackageChannelDefinition', () => {
  it('should return formatted MediaPackageChannel Resource', () => {
    const mediaPackageChannels = getMediaPackageChannelDefinition(channels, 'arn');

    expect(mediaPackageChannels).toStrictEqual(expectations);
  });

  it('should throw an error if a channel contains invalid character', () => {
    expect(() => getMediaPackageChannelDefinition(invalidChannel, 'arn')).toThrow();
  });
});
