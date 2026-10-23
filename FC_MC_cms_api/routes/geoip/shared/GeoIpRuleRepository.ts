import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { GeoIpRulesPage, IGeoIpRuleRepository } from './IGeoIpRuleRepository';
import GeoIpRule from './GeoIpRule';

import { BaseDocument } from '../../shared/interfaces/BaseDocument';
import { GeoIpRuleDto, GeoIpRuleParameters, GeoIpRuleRequestDto } from '../../shared/dto/GeoIpRuleDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { IFactory } from '../../shared/interfaces/IFactory';

export interface GeoIpRuleDocument extends Required<GeoIpRuleDto>, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  'GSI5-PK': string;
  'GSI5-SK': number;
}

export default class GeoIpRuleRepository extends BaseRepository implements IGeoIpRuleRepository {
  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly geoIpRuleFactory: IFactory<GeoIpRule,
    GeoIpRuleRequestDto, Required<GeoIpRuleDto>>,
  ) {
    super(client, tableName);
  }

  static readonly RootEntityType = 'GEO_IP_RULE';

  static readonly ChildEntityType = 'PACKAGE';

  private static ObjectToBase64(payload: object) {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private static Base64ToObject(payload: string) {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  }

  private static getRootEntity(id: string, items: Record<string, any>[]) {
    const [geoIpRule] = items.filter((item) => item.SK === `ASSET#${GeoIpRuleRepository.RootEntityType}#${id}`);
    return geoIpRule as GeoIpRuleDocument;
  }

  private async geoIpRuleMap(rules: GeoIpRuleDocument[]) {
    return Promise.all((rules)?.map(
      async (geoIpRule) => this.geoIpRuleFactory
        .toDomain(geoIpRule),
    ));
  }

  async findAll(geoIpRuleParams?: GeoIpRuleParameters): Promise<GeoIpRulesPage> {
    try {
      const { Items, LastEvaluatedKey } = await this.query({
        IndexName: 'GSI5',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI5-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GeoIpRuleRepository.RootEntityType}`,
        },
        Limit: geoIpRuleParams?.limit,
        ExclusiveStartKey: geoIpRuleParams?.nextToken
          ? GeoIpRuleRepository.Base64ToObject(geoIpRuleParams.nextToken) : undefined,
      });
      const rules = await this.geoIpRuleMap(Items as GeoIpRuleDocument[]);
      return {
        rules,
        nextToken: LastEvaluatedKey
          ? GeoIpRuleRepository.ObjectToBase64(LastEvaluatedKey) : undefined,
      };
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(geoIpRule: GeoIpRule): Promise<boolean> {
    try {
      const rawGeoIpRule = this.geoIpRuleFactory.toPersistence(geoIpRule);
      const rootDocument = {
        PK: `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
        SK: `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
      };
      const packageDocuments = Array.from(rawGeoIpRule.packages || []).map((packageId) => ({
        PK: `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
        SK: `ASSET#${GeoIpRuleRepository.ChildEntityType}#${packageId}`,
      }));
      return !!await this.batchDeleteDocuments([...packageDocuments, rootDocument]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(geoIpRule: GeoIpRule): Promise<boolean> {
    try {
      const rawGeoIpRule = this.geoIpRuleFactory.toPersistence(geoIpRule);
      const geoIpRuleDocument: GeoIpRuleDocument = {
        'GSI1-PK': `ASSET#${GeoIpRuleRepository.RootEntityType}`,
        'GSI1-SK': `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
        'GSI5-PK': `ASSET#${GeoIpRuleRepository.RootEntityType}`,
        'GSI5-SK': geoIpRule.weight,
        PK: `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
        SK: `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
        entityType: GeoIpRuleRepository.RootEntityType,
        ...rawGeoIpRule,
      };
      const packages = Array.from(geoIpRule.packages || []).map((packageItem) => ({
        id: packageItem.id,
        PK: `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
        SK: `ASSET#${GeoIpRuleRepository.ChildEntityType}#${packageItem.id}`,
        'GSI1-PK': `ASSET#${GeoIpRuleRepository.ChildEntityType}#${packageItem.id}`,
        'GSI1-SK': `ASSET#${GeoIpRuleRepository.RootEntityType}#${geoIpRule.id}`,
        entityType: GeoIpRuleRepository.RootEntityType,
      }));
      return !!await this.batchWriteItem([...packages, geoIpRuleDocument]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findOne(id: string): Promise<GeoIpRule | undefined> {
    try {
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GeoIpRuleRepository.RootEntityType}#${id}`,
          ':SK': 'ASSET#',
        },
      });
      if (!Items?.length) return undefined;
      const geoIpRule = GeoIpRuleRepository.getRootEntity(id, Items);
      return await this.geoIpRuleFactory.toDomain(geoIpRule);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async updateWeight(rules: GeoIpRule[]): Promise<boolean> {
    try {
      const updatedRules: GeoIpRuleDocument[] = await Promise.all(rules.map(async (rule) => {
        const rawRule = await this.geoIpRuleFactory.toPersistence(rule);
        return {
          ...rawRule,
          'GSI1-PK': `ASSET#${GeoIpRuleRepository.RootEntityType}`,
          'GSI1-SK': `ASSET#${GeoIpRuleRepository.RootEntityType}#${rule.id}`,
          'GSI5-PK': `ASSET#${GeoIpRuleRepository.RootEntityType}`,
          'GSI5-SK': rule.weight,
          PK: `ASSET#${GeoIpRuleRepository.RootEntityType}#${rule.id}`,
          SK: `ASSET#${GeoIpRuleRepository.RootEntityType}#${rule.id}`,
          entityType: GeoIpRuleRepository.RootEntityType,
        };
      }));

      return !!await this.batchWriteItem(updatedRules);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
