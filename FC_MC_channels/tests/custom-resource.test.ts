import {
  ListPlaybackConfigurationsCommand,
  MediaTailorClient,
  PutPlaybackConfigurationCommand,
} from '@aws-sdk/client-mediatailor';
import { mockClient } from 'aws-sdk-client-mock';
import {
  addCDNToMediaTailorConfigurations,
  getMediaTailorConfigurations,
  MediaTailorCustomResourceEvent,
} from '../broadcast/live-channels/media-tailor-custom-resource';

const taggedConfigMock = {
  AdDecisionServerUrl: 'ads.mediatailor.com',
  AvailSuppression: { Mode: 'OFF' },
  Bumper: {},
  CdnConfiguration: {
    AdSegmentUrlPrefix: 'https://d19jqj7hpo1emn.cloudfront.net/',
    ContentSegmentUrlPrefix: 'https://d288kumy96kvct.cloudfront.net/out/v1',
  },
  DashConfiguration: {
    ManifestEndpointPrefix: 'https://16b4f1e346a94a7393355bb77bc0c727.mediatailor.us-west-2.amazonaws.com/v1/dash/36da43ef19a73084c6c27662c7531ffa75a2f69f/Inelsit_Mis_Canales_VePlus/',
    MpdLocation: 'EMT_DEFAULT',
    OriginManifestType: 'MULTI_PERIOD',
  },
  HlsConfiguration: { ManifestEndpointPrefix: 'https://16b4f1e346a94a7393355bb77bc0c727.mediatailor.us-west-2.amazonaws.com/v1/master/36da43ef19a73084c6c27662c7531ffa75a2f69f/Inelsit_Mis_Canales_VePlus/' },
  LivePreRollConfiguration: {},
  LogConfiguration: { PercentEnabled: 100 },
  ManifestProcessingRules: { AdMarkerPassthrough: { Enabled: true } },
  Name: 'Inelsit_Mis_Canales_VePlus',
  PlaybackConfigurationArn: 'arn:aws:mediatailor:us-west-2:199718138082:playbackConfiguration/Inelsit_Mis_Canales_VePlus',
  PlaybackEndpointPrefix: 'https://16b4f1e346a94a7393355bb77bc0c727.mediatailor.us-west-2.amazonaws.com',
  SessionInitializationEndpointPrefix: 'https://16b4f1e346a94a7393355bb77bc0c727.mediatailor.us-west-2.amazonaws.com/v1/session/36da43ef19a73084c6c27662c7531ffa75a2f69f/Inelsit_Mis_Canales_VePlus/',
  Tags: { project: 'freecast-live', STAGE: 'dev' },
  VideoContentSourceUrl: 'https://3ae97e9482b0d011.mediapackage.us-west-2.amazonaws.com/out/v1/',
};

const untaggedConfigMock = {
  AdDecisionServerUrl: 'ads.mediatailor.com',
  AvailSuppression: { Mode: 'OFF', Value: undefined },
  Bumper: { EndUrl: undefined, StartUrl: undefined },
  CdnConfiguration: { AdSegmentUrlPrefix: undefined, ContentSegmentUrlPrefix: undefined },
  ConfigurationAliases: undefined,
  DashConfiguration: {
    ManifestEndpointPrefix: 'https://6734bdf2762f49079e5d5efe692b2801.mediatailor.us-west-2.amazonaws.com/v1/dash/36da43ef19a73084c6c27662c7531ffa75a2f69f/TestCampaign/',
    MpdLocation: 'EMT_DEFAULT',
    OriginManifestType: 'MULTI_PERIOD',
  },
  HlsConfiguration: { ManifestEndpointPrefix: 'https://6734bdf2762f49079e5d5efe692b2801.mediatailor.us-west-2.amazonaws.com/v1/master/36da43ef19a73084c6c27662c7531ffa75a2f69f/TestCampaign/' },
  LivePreRollConfiguration: { AdDecisionServerUrl: undefined, MaxDurationSeconds: undefined },
  LogConfiguration: { PercentEnabled: 100 },
  ManifestProcessingRules: { AdMarkerPassthrough: { Enabled: true } },
  Name: 'TestCampaign',
  PersonalizationThresholdSeconds: undefined,
  PlaybackConfigurationArn: 'arn:aws:mediatailor:us-west-2:199718138082:playbackConfiguration/TestCampaign',
  PlaybackEndpointPrefix: 'https://6734bdf2762f49079e5d5efe692b2801.mediatailor.us-west-2.amazonaws.com',
  SessionInitializationEndpointPrefix: 'https://6734bdf2762f49079e5d5efe692b2801.mediatailor.us-west-2.amazonaws.com/v1/session/36da43ef19a73084c6c27662c7531ffa75a2f69f/TestCampaign/',
  SlateAdUrl: undefined,
  Tags: {},
  TranscodeProfileName: undefined,
  VideoContentSourceUrl: 'https://c4af3793bf76b33c.mediapackage.us-west-2.amazonaws.com/out/v1',
};

const eventMock: MediaTailorCustomResourceEvent = {
  LogicalResourceId: '',
  RequestId: '',
  RequestType: 'Create',
  ResourceProperties: {
    ServiceToken: '',
    AdCDN: 'd222222abcdef8.cloudfront.net',
    SegmentCDN: 'd111111abcdef8.cloudfront.net',
    Region: 'us-west-2',
  },
  ResourceType: '',
  ResponseURL: '',
  ServiceToken: '',
  StackId: '',
};

const client = new MediaTailorClient({});

describe('getMediaTailorConfigurations', () => {
  const mediaTailorClientMock = mockClient(client);
  const oldEnv = process.env;

  beforeEach(() => {
    mediaTailorClientMock.reset();
  });

  beforeAll(() => {
    process.env = {
      ...oldEnv,
      PROJECT: 'freecast-live',
      STAGE: 'dev',
    };
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it('should return an empty array', async () => {
    mediaTailorClientMock.on(ListPlaybackConfigurationsCommand).resolves({
      Items: [untaggedConfigMock],
    });
    expect(await getMediaTailorConfigurations(client)).toEqual([]);
  });

  it('should return two configurations with correct tags', async () => {
    mediaTailorClientMock.on(ListPlaybackConfigurationsCommand).resolves({
      Items: [taggedConfigMock, taggedConfigMock],
    });
    expect(await getMediaTailorConfigurations(client))
      .toEqual([taggedConfigMock, taggedConfigMock]);
    expect(await getMediaTailorConfigurations(client)).toHaveLength(2);
  });

  it('should return two configurations with pagination', async () => {
    mediaTailorClientMock.on(ListPlaybackConfigurationsCommand).resolvesOnce({
      Items: [taggedConfigMock],
      NextToken: 'random',
    }).resolvesOnce({
      Items: [untaggedConfigMock],
      NextToken: 'random',
    }).resolvesOnce({
      Items: [taggedConfigMock],
    });
    expect(await getMediaTailorConfigurations(client))
      .toEqual([taggedConfigMock, taggedConfigMock]);
  });
});

describe('addCDNToMediaTailorConfigurations', () => {
  const mediaTailorClientMock = mockClient(client);

  beforeEach(() => {
    mediaTailorClientMock.reset();
  });

  it('should add CDN to MediaTailor configs and an array of config', async () => {
    const expected = {
      ...taggedConfigMock,
      CdnConfiguration: {
        AdSegmentUrlPrefix: eventMock.ResourceProperties.AdCDN,
        ContentSegmentUrlPrefix: eventMock.ResourceProperties.SegmentCDN,
      },
    };
    mediaTailorClientMock.on(PutPlaybackConfigurationCommand)
      .resolves(expected);
    expect(await addCDNToMediaTailorConfigurations(
      eventMock,
      client,
      [taggedConfigMock],
    ))
      .toStrictEqual([expected]);
  });
});
