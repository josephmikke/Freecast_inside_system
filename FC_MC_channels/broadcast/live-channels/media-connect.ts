import { LiveChannel, Mode } from '../../shared/interfaces';
import { MAGIC_NUMBER } from '../../shared/variables';

export default (channels: LiveChannel[]) => {
  const regex = /^[a-zA-Z0-9_-]*$/;
  return channels.reduce((curr, channel, index) => {
    if (!regex.test(channel.name)) throw new Error(`Invalid channel name ${channel.name}. Valid characters: A-Z, a-z, _- and 0-9`);
    let source;
    switch (channel.mode) {
      case Mode.HLS:
        return curr;
      case Mode.SRT_CALLER:
        source = {
          Name: channel.name,
          Description: 'SRT to AWS',
          Protocol: 'srt-caller',
          SourceListenerAddress: channel.sourceListenerAddress,
          SourceListenerPort: channel.sourceListenerPort,
        };
        break;
      case Mode.SRT_LISTENER:
        source = {
          Name: channel.name,
          Description: 'SRT to AWS',
          IngestPort: 2000,
          Protocol: 'srt-listener',
          WhitelistCidr: '0.0.0.0/0',
        };
        break;
      default:
        return curr;
    }
    return {
      ...curr,
      [`MediaConnectFlow${index + MAGIC_NUMBER}`]: {
        Type: 'AWS::MediaConnect::Flow',
        Properties: {
          AvailabilityZone: {
            'Fn::Select': [
              `${channel.az}`,
              {
                'Fn::GetAZs': { Ref: 'AWS::Region' },
              },
            ],
          },
          Name: channel.name,
          Source: {
            ...source,
          },
        },
      },
    };
  }, {});
};
