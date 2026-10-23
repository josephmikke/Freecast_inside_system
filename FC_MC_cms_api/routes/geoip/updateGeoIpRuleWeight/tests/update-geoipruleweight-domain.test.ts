import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { InMemoryBrandRepository, InMemoryDistributorRepository } from '../../../../utils/in-memory-relation-repositories';
import { initDatabase, mockJestTimers } from '../../../../utils/jest-utils';
import UpdateGeoIpRuleWeightDomain from '../UpdateGeoIpRuleWeightDomain';

import {
  CreateIPSetCommand,
  CreateRuleGroupCommand,
  GetWebACLCommand,
  UpdateWebACLCommand,
  WAFV2Client,
} from '@aws-sdk/client-wafv2';
import { DescribeOriginEndpointCommand, MediaPackageClient } from '@aws-sdk/client-mediapackage';

import OriginEndpoint from '../../shared/OriginEndpoint';
import ProviderMap from '../../../provider/shared/ProviderMap';
import ProviderRepository from '../../../provider/shared/ProviderRepository';
import EPGTemplateFactory from '../../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../../epgTemplate/shared/EPGTemplateRepository';
import EPGProgramBuilder from '../../../epg/shared/EPGProgramBuilder';
import EPGFactory from '../../../epg/shared/EPGFactory';
import EPGRepository from '../../../epg/shared/EPGRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import GenreMap from '../../../genre/shared/GenreMap';
import GenreRepository from '../../../genre/shared/GenreRepository';
import LocationFactory from '../../../location/shared/LocationFactory';
import LocationRepository from '../../../location/shared/LocationRepository';
import StreamFactory from '../../../stream/shared/StreamFactory';
import StreamRepository from '../../../stream/shared/StreamRepository';
import ChannelFactory from '../../../channel/shared/ChannelFactory';
import ChannelRepository from '../../../channel/shared/ChannelRepository';
import GeoIpRuleFactory from '../../shared/GeoIpRuleFactory';
import GeoIpRuleRepository from '../../shared/GeoIpRuleRepository';
import IPSetAdaptor from '../../shared/IPSetAdaptor';
import RuleGroupAdaptor from '../../shared/RuleGroupAdaptor';
import RuleBuilder from '../../shared/RuleBuilder';
import FirewallAdaptor from '../../shared/FirewallAdaptor';
import { GeoIpRulePolicyType, GeoIpRuleType } from '../../../shared/dto/GeoIpRuleDto';
import CategoryMap from '../../../category/shared/CategoryMap';
import CategoryRepository from '../../../category/shared/CategoryRepository';

import { mockClient } from 'aws-sdk-client-mock';

import MovieFactory from '../../../vod/movie/shared/MovieFactory';
import EpisodeFactory from '../../../vod/episode/shared/EpisodeFactory';
import EpisodeRepository from '../../../vod/episode/shared/EpisodeRepository';
import SeriesFactory from '../../../vod/series/shared/SeriesFactory';
import SeriesRepository from '../../../vod/series/shared/SeriesRepository';
import MovieRepository from '../../../vod/movie/shared/MovieRepository';

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-updateGeoIpRuleWeightDomain');
mockJestTimers();

describe('UpdateGeoIpRuleWeightDomain', () => {
  const OLD_ENV = process.env;
  const wafMock = mockClient(WAFV2Client);
  const mediaPackageMock = mockClient(MediaPackageClient);

  beforeAll(() => {
    wafMock.reset();
    mediaPackageMock.reset();
  });

  beforeEach(() => {
    jest.resetModules(); // Most important - it clears the cache
    process.env = {
      WEB_ACL_NAME: 'prod-DistributionACL',
      WEB_ACL_ID: 'dfc706c0-1be2-457d-8fc4-e8a0fb8679f1',
    };
  });

  afterAll(() => {
    process.env = OLD_ENV; // Restore old environment
  });

  describe('updateGeoIpRuleWeight', () => {
    it.only('should change the weight of all GeoIp rules', async () => {
      // Arrange
      const wafClient = new WAFV2Client({});
      const mpClient = new MediaPackageClient({});
      const uid = new UIDGenerator();
      const originEndpointAdaptor = new OriginEndpoint(mpClient);
      const providerMap = new ProviderMap(uid);
      const providerRepository = new ProviderRepository(
        ddbClient,
        TEST_TABLE_NAME,
        providerMap,
      );

      const epgTemplateFactory = new EPGTemplateFactory(uid);
      const epgTemplateRepository = new EPGTemplateRepository(
        ddbClient,
        TEST_TABLE_NAME,
        epgTemplateFactory,
      );
      const programBuilder = new EPGProgramBuilder(uid);
      const epgFactory = new EPGFactory(uid, epgTemplateRepository);
      const epgRepository = new EPGRepository(
        ddbClient,
        TEST_TABLE_NAME,
        epgFactory,
        programBuilder,
      );

      const platformMap = new PlatformMap(uid);
      const platformRepository = new PlatformRepository(
        ddbClient,
        TEST_TABLE_NAME,
        platformMap,
      );

      const categoryMap = new CategoryMap(uid);
      const categoryRepository = new CategoryRepository(
        ddbClient,
        TEST_TABLE_NAME,
        categoryMap,
      );

      const packageFactory = new PackageFactory(uid, platformRepository);
      const packageRepository = new PackageRepository(
        ddbClient,
        TEST_TABLE_NAME,
        packageFactory,
      );

      const genreMap = new GenreMap(uid);
      const genreRepository = new GenreRepository(
        ddbClient,
        TEST_TABLE_NAME,
        genreMap,
      );

      const locationFactory = new LocationFactory(uid, packageRepository);
      const locationRepository = new LocationRepository(
        ddbClient,
        TEST_TABLE_NAME,
        locationFactory,
      );

      const streamFactory = new StreamFactory(uid);
      const streamRepository = new StreamRepository(
        ddbClient,
        TEST_TABLE_NAME,
        streamFactory,
      );

      const distributorRepository = new InMemoryDistributorRepository();

      const brandRepository = new InMemoryBrandRepository();

      const channelFactory = new ChannelFactory(
        uid,
        providerRepository,
        epgRepository,
        platformRepository,
        categoryRepository,
        packageRepository,
        genreRepository,
        locationRepository,
        streamRepository,
        distributorRepository,
        brandRepository,
      );

      const channelRepository = new ChannelRepository(
        ddbClient,
        TEST_TABLE_NAME,
        channelFactory,
      );

      const movieFactory = new MovieFactory(
        uid,
        providerRepository,
        platformRepository,
        categoryRepository,
        packageRepository,
        genreRepository,
        locationRepository,
        streamRepository,
        distributorRepository,
        brandRepository,
        'default/nothumbnail/thumbnail.png',
      );

      const episodeFactory = new EpisodeFactory(
        uid,
        streamRepository,
        'default/nothumbnail/thumbnail.png',
      );

      const episodeRepository = new EpisodeRepository(
        ddbClient,
        TEST_TABLE_NAME,
        episodeFactory,
      );

      const seriesFactory = new SeriesFactory(
        uid,
        providerRepository,
        platformRepository,
        categoryRepository,
        packageRepository,
        genreRepository,
        locationRepository,
        episodeRepository,
        distributorRepository,
        brandRepository,
        'default/nothumbnail/thumbnail.png',
      );

      const seriesRepository = new SeriesRepository(
        ddbClient,
        TEST_TABLE_NAME,
        seriesFactory,
      );

      const movieRepository = new MovieRepository(
        ddbClient,
        TEST_TABLE_NAME,
        movieFactory,
      );

      const geoIpRuleFactory = new GeoIpRuleFactory(uid, packageRepository);
      const geoIpRuleRepository = new GeoIpRuleRepository(
        ddbClient,
        TEST_TABLE_NAME,
        geoIpRuleFactory,
      );
      const ipSetAdaptor = new IPSetAdaptor(wafClient);
      const ruleGroupAdaptor = new RuleGroupAdaptor(wafClient);
      const ruleBuilder = new RuleBuilder();
      const firewallAdaptor = new FirewallAdaptor(
        wafClient,
        ruleBuilder,
        geoIpRuleRepository,
        channelRepository,
        originEndpointAdaptor,
        ipSetAdaptor,
        ruleGroupAdaptor,
        seriesRepository,
        movieRepository,
      );
      const domain = new UpdateGeoIpRuleWeightDomain(geoIpRuleRepository, firewallAdaptor);

      mediaPackageMock.on(DescribeOriginEndpointCommand)
        .resolves({
          ChannelId: 'vubiquity_Value_Reelz',
          Url: 'https://cf98fa7b2ee4450e.mediapackage.us-east-1.amazonaws.com/out/v1/1179f4e0839f455eb79fea7a5621ce42/index.mpd',
        });
      wafMock.on(CreateRuleGroupCommand).resolvesOnce({
        Summary: {
          Name: 'vubiquity_Value_Reelz',
          Id: 'vubiquity_Value_Reelz',
          Description: 'Mocked description',
          LockToken: uid.generate(10),
          ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/rulegroup/GroupName/uuid',
        },
      }).resolvesOnce({
        Summary: {
          Name: 'vubiquity_Value_AXS',
          Id: 'vubiquity_Value_Reelz',
          Description: 'Mocked description',
          LockToken: uid.generate(10),
          ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/rulegroup/GroupName/uuid',
        },
      });
      wafMock.on(CreateIPSetCommand).resolves({ // CreateIPSetResponse
        Summary: { // IPSetSummary
          Name: 'Block One Ip',
          Id: 'cb1bd443-00f9-4c05-b69b-7dbc64056fa5',
          Description: 'Mocked description',
          LockToken: uid.generate(10),
          ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/ipset/IpSetName/uuid',
        },
      });
      wafMock.on(UpdateWebACLCommand).resolves({
        NextLockToken: uid.generate(10),
      });
      wafMock.on(GetWebACLCommand).resolves({
        // @ts-ignore
        WebACL: {
          Name: 'prod-WebACL', // required
          Id: 'cb1bd443-00f9-4c05-b69b-7dbc64056fa5', // required
          ARN: 'arn:aws:wafv2:us-east-1:acc_number:global/webacl/uuid', // required,
        },
        ApplicationIntegrationURL: '',
        LockToken: uid.generate(10),
      });

      await Promise.all(Array.from(Array(5).keys()).map(async (key) => {
        const rule = await geoIpRuleFactory.toDomain({
          description: `Rule #${key}`,
          name: `Rule_${key}`,
          packages: [],
          policyType: GeoIpRulePolicyType.ALLOW,
          ruleType: GeoIpRuleType.LOCATION,
          value: 'FR',
          weight: key,
          id: key.toString(),
        });
        await geoIpRuleRepository.save(rule);
      }));

      // Act
      const shouldBeTruthy = await domain.updateGeoIpRuleWeight('2', '5');
      const { rules: updatedRules } = await geoIpRuleRepository.findAll({ limit: 1000 });

      // Assert
      expect(shouldBeTruthy).toBeTruthy();
      expect(updatedRules[4].weight).toEqual(4);
      expect(updatedRules[4].id).toEqual('2');
    });
  });
});
