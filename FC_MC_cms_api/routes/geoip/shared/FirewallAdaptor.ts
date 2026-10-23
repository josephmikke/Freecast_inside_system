import { setTimeout } from 'timers/promises';

import {
  GetWebACLCommand,
  Statement,
  UpdateWebACLCommand,
  WAFUnavailableEntityException,
  WAFV2Client,
} from '@aws-sdk/client-wafv2';
import { Rule } from '@aws-sdk/client-wafv2';

import Channel from '../../channel/shared/Channel';
import { IChannelRepository } from '../../channel/shared/IChannelRepository';
import Package from '../../package/shared/Package';
import { GeoIpRuleType } from '../../shared/dto/GeoIpRuleDto';
import { ValueObject } from '../../shared/interfaces/ValueObject';
import CIDR from '../../shared/valueObjects/CIDR';
import CountryCode from '../../shared/valueObjects/CountryCode';
import MediaPackageId from '../../shared/valueObjects/MediaPackageId';
import { IMovieRepository } from '../../vod/movie/shared/IMovieRepository';
import { ISeriesRepository } from '../../vod/series/shared/ISeriesRepository';

import { FirewallError } from './FirewallError';
import GeoIpRule from './GeoIpRule';
import { IFirewallAdaptor } from './IFirewallAdaptor';
import { IGeoIpRuleRepository } from './IGeoIpRuleRepository';
import { IIPSet } from './IIPSet';
import { IOriginEndpoint } from './IOriginEndpoint';
import { IRuleBuilder } from './IRuleBuilder';
import { IRuleGroup } from './IRuleGroup';
import { IRuleTransfomer } from './IRuleTransfomer';
import { RuleGroup } from './RuleGroupAdaptor';

interface OriginEndpoints {
  [mediaPackageId: string]: string[]
}

export default class FirewallAdaptor implements IFirewallAdaptor<Rule>,
    IRuleTransfomer<GeoIpRule, Rule> {
  constructor(
    private readonly client: WAFV2Client,
    private ruleBuilder: IRuleBuilder<Rule, Statement>,
    private readonly ruleRepository: IGeoIpRuleRepository,
    private readonly channelRepository: IChannelRepository,
    private readonly originEndpointAdaptor: IOriginEndpoint<ValueObject<MediaPackageId>>,
    private readonly ipSetAdaptor: IIPSet,
    private readonly ruleGroupAdaptor: IRuleGroup<Rule[], RuleGroup | undefined>,
    private readonly seriesRepository: ISeriesRepository,
    private readonly movieRepository: IMovieRepository,
  ) {
  }

  private static RETRY_COUNT = 0;

  private static MAX_RETRY = 10;

  private static TIMEOUT = 1000;

  private async getLockToken() {
    try {
      const command = new GetWebACLCommand({
        Name: process.env.WEB_ACL_NAME,
        Id: process.env.WEB_ACL_ID,
        Scope: 'CLOUDFRONT',
      });
      const { LockToken } = await this.client.send(command);
      return LockToken;
    } catch (e) {
      throw new FirewallError.UnableToGetLockToken(e);
    }
  }

  private static async setStatementType(
    builder: IRuleBuilder<Rule, Statement>,
    ruleType: GeoIpRuleType,
    value: CIDR | CountryCode | string,
  ) {
    const statement = {
      [GeoIpRuleType.LOCATION]: () => builder
        .setLocationStatement(value as CountryCode).getResult().Statement!,
      [GeoIpRuleType.CIDR]: async () => (await builder
        .setCIDRStatement(value as string)).getResult().Statement!,
      [GeoIpRuleType.USER_AGENT]: () => builder
        .setUserAgentStatement(value as string).getResult().Statement!,
      default: () => builder
        .setRuleGroup(value as string).getResult().Statement!,
    };
    return (statement[ruleType as keyof typeof GeoIpRuleType] || statement.default)();
  }

  private getOriginIdMap(endpoint: string) {
    return endpoint.split('/')[5];
  }

  private async describeOriginEndpointsMap(channel: Channel): Promise<OriginEndpoints> {
    const ids = await this.originEndpointAdaptor.describeOriginEndpoints(channel.mediapackageId);
    return ids.reduce((acc, curr) => {
      acc[channel.mediapackageId.value()].push(this.getOriginIdMap(curr));
      return acc;
    }, { [channel.mediapackageId.value()]: [] as string[] });
  }

  private async findChannelByPackage(pkg: Package) {
    const { channels } = await this.channelRepository.findAll({
      filter: {
        packages: [pkg.id],
      },
      limit: 100,
      exclude: 'platforms,categories,genres,locations,distributors,brands,streams,epg',
    });
    return Promise.all(channels.filter((channel) => channel.mediapackageId.value())
      .map(this.describeOriginEndpointsMap.bind(this)));
  }

  private uniqueArrayOfObj(items: { [p: string]: string[] }[]): OriginEndpoints[] {
    return [...new Set(items.flat().map((o) => JSON.stringify(o)))].map((s) => JSON.parse(s));
  }

  private async findMediaPackageIds(rule: GeoIpRule): Promise<OriginEndpoints[]> {
    const mediaPackages = await Promise.all(rule.packages
      .map(this.findChannelByPackage.bind(this)));
    return this.uniqueArrayOfObj(mediaPackages.flat());
  }

  private async findMovieByPackage(pkg: Package) {
    const { movies } = await this.movieRepository.findAll({
      filter: {
        packages: [pkg.id],
      },
      limit: 1000,
      exclude: 'platforms,categories,genres,locations,distributors,brands,epg',
    });
    const endpoints = movies.filter((movie) => movie.streams && movie.streams?.length > 0)
      .map((movie: any) => (movie.streams)?.[0]?.data.split('/')[5]).filter(Boolean);
    return [...new Set(endpoints)];
  }

  private async findSeriesByPackage(pkg: Package) {
    const { series } = await this.seriesRepository.findAll({
      filter: {
        packages: [pkg.id],
      },
      limit: 1000,
      exclude: 'platforms,categories,genres,locations,distributors,brands,epg',
    });
    const seriesWithEpisodes = series.filter((item) => (item.episodes?.length
        && item.episodes.length > 0));
    return [...new Set(seriesWithEpisodes.map((item) => item.episodes!
      .map((episode) => (episode.streams)?.[0]?.data.split('/')[5]).filter(Boolean)))];
  }

  async transform(rule: GeoIpRule, origins?: string[]): Promise<Rule> {
    const builder = this.ruleBuilder.create();
    builder.setName(rule.name)
      .setPriority(rule.weight);
    if (rule.ruleType !== undefined) builder.setAction(rule.policyType);
    if (origins) {
      builder.setAndStatement(
        await FirewallAdaptor.setStatementType(builder, rule.ruleType, rule.value),
        origins,
      );
    } else {
      await FirewallAdaptor.setStatementType(builder, rule.ruleType, rule.value);
    }
    return builder.getResult();
  }

  private async retry(rules: Rule[], e: any) {
    if (FirewallAdaptor.RETRY_COUNT < FirewallAdaptor.MAX_RETRY) {
      FirewallAdaptor.RETRY_COUNT += 1;
      console.log('RETRY COUNT', FirewallAdaptor.RETRY_COUNT);
      return setTimeout(
        2 ** FirewallAdaptor.RETRY_COUNT * FirewallAdaptor.TIMEOUT,
        this.createACL(rules),
      );
    }
    console.log('RETRY EXCEEDED', FirewallAdaptor.RETRY_COUNT);
    throw new FirewallError.UnableToCreateACL(e);
  }

  async createACL(rules: Rule[]): Promise<boolean> {
    try {
      const lockToken = await this.getLockToken();
      const input = {
        Name: process.env.WEB_ACL_NAME,
        Id: process.env.WEB_ACL_ID,
        Scope: 'CLOUDFRONT',
        DefaultAction: {
          Block: {},
        },
        Rules: rules,
        Description: 'Access Control List for MediaPackage CloudFront distribution',
        LockToken: lockToken,
        VisibilityConfig: {
          SampledRequestsEnabled: true,
          CloudWatchMetricsEnabled: true,
          MetricName: process.env.WEB_ACL_NAME,
        },
      };
      // @ts-ignore
      const command = new UpdateWebACLCommand(input);
      console.log(JSON.stringify(input, null, 2));
      return !!await this.client.send(command);
    } catch (e) {
      switch (true) {
        case e instanceof WAFUnavailableEntityException:
          return await this.retry(rules, e);
        default:
          throw new FirewallError.UnableToCreateACL(e);
      }
    }
  }

  private async geoIpRuleMap(geoIpRule: GeoIpRule): Promise<Rule> {
    const mediaPackageIds = await this.findMediaPackageIds(geoIpRule);
    const moviesEndpoints = await Promise.all([...new Set(geoIpRule.packages
      .map(this.findMovieByPackage.bind(this)))]);
    const episodeEndpoints = await Promise.all([...new Set(geoIpRule.packages
      .map(this.findSeriesByPackage.bind(this)))]);
    const flattenEndpoints = [...new Set(moviesEndpoints.flat(5)),
      ...new Set(episodeEndpoints.flat(5))];
    let { value } = geoIpRule;
    if (geoIpRule.ruleType === GeoIpRuleType.CIDR) {
      let arn = await this.ipSetAdaptor.exists(geoIpRule.name);
      if (!arn) {
        arn = await this.ipSetAdaptor.create(geoIpRule.name, value as CIDR);
        await setTimeout(FirewallAdaptor.TIMEOUT); // Wait for the ipset to be  available
      }
      value = arn;
    }
    if (!mediaPackageIds.length) {
      return this.transform(Object.assign({}, geoIpRule, { value }));
    }
    let rulesForPackages = await Promise.all(mediaPackageIds.map(async (mediaPackage, key) => {
      const [[name, origins]] = Object.entries(mediaPackage);
      return this.transform(Object.assign({}, geoIpRule, { name, weight: key, value }), origins);
    }));
    if (flattenEndpoints.length > 0) {
      const perChunk = 4; // items per chunk
      const chunks = flattenEndpoints.reduce((acc: string[][], curr, index) => {
        const chunkIndex = Math.floor(index / perChunk);
        if (!acc[chunkIndex]) {
          acc[chunkIndex] = []; // start a new chunk
        }
        acc[chunkIndex].push(curr);
        return acc;
      }, []);
      rulesForPackages = await Promise.all([...rulesForPackages,
        ...chunks.map((chunk, key) => this.transform(Object.assign(
          {},
          geoIpRule,
          { name: `vod-chunk-${key}`, weight: rulesForPackages.length + key, value },
        ), chunk))]);
    }
    const ruleGroup = await this.ruleGroupAdaptor.exists(geoIpRule.name);
    let ruleGroupArn = '';
    if (ruleGroup && ruleGroup.rules.length !== rulesForPackages.length) {
      await this.ruleGroupAdaptor.delete(geoIpRule.name);
      ruleGroupArn = await this.ruleGroupAdaptor.create(
        geoIpRule.name,
        rulesForPackages,
      );
    }
    if (!ruleGroup) {
      ruleGroupArn = await this.ruleGroupAdaptor.create(
        geoIpRule.name,
        rulesForPackages,
      );
    }
    await setTimeout(FirewallAdaptor.TIMEOUT);
    return this.transform(Object.assign({}, geoIpRule, {
      ruleType: undefined,
      value: ruleGroupArn !== '' ? ruleGroupArn : ruleGroup?.arn,
    }));
  }

  async createRule(rule?: GeoIpRule): Promise<Rule[]> {
    try {
      await this.createACL([]);
      const { rules: existingRules } = await this.ruleRepository.findAll({ limit: 1000 });
      const geoIpRules: GeoIpRule[] | any[] = [
        ...existingRules,
        rule,
      ].filter(Boolean);
      const enabledGeoIpRule = geoIpRules.filter((geoIpRule) => geoIpRule.enabled);
      return await Promise.all(enabledGeoIpRule.map(this.geoIpRuleMap.bind(this)));
    } catch (e) {
      console.log(e);
      throw e;
    }
  }
}
