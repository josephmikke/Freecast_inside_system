import { LiveChannel } from '../../shared/interfaces';
import { MAGIC_NUMBER } from '../../shared/variables';

export default (channels: LiveChannel[], adsUrl: string) => {
  const regex = /^[a-zA-Z0-9_-]*$/;
  return channels.reduce((curr, channel, index) => {
    if (!regex.test(channel.name)) throw new Error(`Invalid channel name ${channel.name}. Valid characters: A-Z, a-z, _- and 0-9`);
    return {
      ...curr,
      [`MediaTailorCampaign${index + MAGIC_NUMBER}`]: {
        Type: 'AWS::MediaTailor::PlaybackConfiguration',
        Properties: {
          Name: channel.name,
          VideoContentSourceUrl: {
            'Fn::Sub': ['https://${Domain}/out/v1/', {
              Domain: {
                'Fn::Select': [2, {
                  'Fn::Split': ['/', {
                    'Fn::GetAtt': [`MediaPackagePackageHLSEndpoint${index + MAGIC_NUMBER}`, 'Url'],
                  }],
                }],
              },
            }],
          },
          AdDecisionServerUrl: adsUrl,
          Tags: [
            {
              Key: 'map-migrated',
              Value: 'd-server-03ldkhdk7ade4y',
            },
          ],
        },
        DependsOn: [`MediaPackagePackageHLSEndpoint${index + MAGIC_NUMBER}`],
      },
    };
  }, {});
};
