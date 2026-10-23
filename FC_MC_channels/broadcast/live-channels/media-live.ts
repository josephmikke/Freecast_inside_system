import videoDescriptions from '../encoder-settings/video-descriptions';
import audioDescriptions from '../encoder-settings/audio-descriptions';
import outputs from '../encoder-settings/outputs';
import { LiveChannel } from '../../shared/interfaces';
import captionDescriptions from '../encoder-settings/caption-descriptions';
import { MAGIC_NUMBER } from '../../shared/variables';

export default (channels: LiveChannel[]) => {
  const regex = /^[a-zA-Z0-9_-]*$/;
  const FIRST_CHANNEL = 1;

  return channels.reduce((curr, channel, index) => {
    if (!regex.test(channel.name)) throw new Error(`Invalid channel name ${channel.name}. Valid characters: A-Z, a-z, _- and 0-9`);
    let mediaLiveInputProperties;
    if (channel.url) {
      mediaLiveInputProperties = {
        Type: 'URL_PULL',
        Sources: [{ Url: channel.url }],
      };
    } else {
      mediaLiveInputProperties = {
        Type: 'MEDIACONNECT',
        MediaConnectFlows: [{
          FlowArn: { 'Fn::GetAtt': [`MediaConnectFlow${index + MAGIC_NUMBER}`, 'FlowArn'] },
        }],
      };
    }

    return {
      ...curr,
      [`MediaLiveInput${index + MAGIC_NUMBER}`]: {
        Type: 'AWS::MediaLive::Input',
        ...((index >= FIRST_CHANNEL && (index + MAGIC_NUMBER) % 5 !== 0) && { DependsOn: `MediaLiveInput${(index + MAGIC_NUMBER) - 1}` }),
        Properties: {
          Name: channel.name,
          ...mediaLiveInputProperties,
          RoleArn: { 'Fn::GetAtt': ['MediaLiveAccessRole', 'Arn'] },
          Tags: {
            'map-migrated': 'd-server-03ldkhdk7ade4y',
          },
        },
      },
      [`MediaLiveChannel${index + MAGIC_NUMBER}`]: {
        Type: 'AWS::MediaLive::Channel',
        Properties: {
          Name: channel.name,
          ChannelClass: 'SINGLE_PIPELINE',
          InputAttachments: [{
            InputId: { Ref: `MediaLiveInput${index + MAGIC_NUMBER}` },
            InputSettings: {
              CaptionSelectors: [{
                Name: 'English',
                SelectorSettings: {
                  EmbeddedSourceSettings: {
                    Source608ChannelNumber: 1,
                    Source608TrackNumber: 1,
                    Convert608To708: 'DISABLED',
                    Scte20Detection: 'OFF',
                  },
                },
              }],
            },
          }],
          InputSpecification: {
            Codec: 'AVC',
            MaximumBitrate: 'MAX_10_MBPS',
            Resolution: 'HD',
          },
          Destinations: [{
            Id: 'MediaPackage',
            MediaPackageSettings: [{
              ChannelId: channel.name,
            }],
          }],
          EncoderSettings: {
            TimecodeConfig: {
              Source: 'SYSTEMCLOCK',
            },
            VideoDescriptions: videoDescriptions,
            AudioDescriptions: audioDescriptions,
            CaptionDescriptions: captionDescriptions,
            OutputGroups: [{
              Name: 'MediaPackage',
              OutputGroupSettings: {
                MediaPackageGroupSettings: {
                  Destination: {
                    DestinationRefId: 'MediaPackage',
                  },
                },
              },
              Outputs: outputs,
            }],
          },
          RoleArn: { 'Fn::GetAtt': ['MediaLiveAccessRole', 'Arn'] },
          Tags: {
            'map-migrated': 'd-server-03ldkhdk7ade4y',
          },
        },
      },
    };
  }, {});
};
