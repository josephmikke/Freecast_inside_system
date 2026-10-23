import getMediaConnectFlowDefinition from '../broadcast/live-channels/media-connect';

const channels = [
  { name: 'test1', az: 0 },
  { name: 'channel2', az: 1 },
  { name: 'channel3', az: 2 },
  { name: 'channel4', az: 0, url: 'http://localhost:8080/index.m3u8' },
];

const invalidChannel = [
  { name: 'test+', az: 0 },
];

const expectations = {
  MediaConnectFlow0: {
    Type: 'AWS::MediaConnect::Flow',
    Properties: {
      AvailabilityZone: {
        'Fn::Select': [
          '0',
          {
            'Fn::GetAZs': {
              Ref: 'AWS::Region',
            },
          },
        ],
      },
      Name: 'test1',
      Source: {
        Description: 'SRT to AWS',
        IngestPort: 2000,
        Name: 'test1',
        Protocol: 'srt-listener',
        WhitelistCidr: '0.0.0.0/0',
      },
    },
  },
  MediaConnectFlow1: {
    Type: 'AWS::MediaConnect::Flow',
    Properties: {
      AvailabilityZone: {
        'Fn::Select': [
          '1',
          {
            'Fn::GetAZs': {
              Ref: 'AWS::Region',
            },
          },
        ],
      },
      Name: 'channel2',
      Source: {
        Description: 'SRT to AWS',
        IngestPort: 2000,
        Name: 'channel2',
        Protocol: 'srt-listener',
        WhitelistCidr: '0.0.0.0/0',
      },
    },
  },
  MediaConnectFlow2: {
    Type: 'AWS::MediaConnect::Flow',
    Properties: {
      AvailabilityZone: {
        'Fn::Select': [
          '2',
          {
            'Fn::GetAZs': {
              Ref: 'AWS::Region',
            },
          },
        ],
      },
      Name: 'channel3',
      Source: {
        Description: 'SRT to AWS',
        IngestPort: 2000,
        Name: 'channel3',
        Protocol: 'srt-listener',
        WhitelistCidr: '0.0.0.0/0',
      },
    },
  },
};

describe('getMediaConnectFlowDefinition', () => {
  beforeEach(() => {
    // This mock allows Math.floor(Math.random() * 3) to always return 2
    jest.spyOn(global.Math, 'random').mockReturnValue(0.9);
  });

  afterEach(() => {
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('should return formatted MediaConnectFlow Resource', () => {
    const mediaConnectFlows = getMediaConnectFlowDefinition(channels);

    expect(mediaConnectFlows).toStrictEqual(expectations);
  });

  it('should throw an error if a channel contains invalid character', () => {
    expect(() => getMediaConnectFlowDefinition(invalidChannel)).toThrow();
  });
});
