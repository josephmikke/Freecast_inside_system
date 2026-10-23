import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { ChannelPage, IChannelRepository } from './IChannelRepository';
import Channel, { ROOT_ENTITY } from './Channel';

import { IFactory } from '../../shared/interfaces/IFactory';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';
import {
  ChannelRequestDto, ChannelDto, ChannelsParameters, SortType, SortOrder,
} from '../../shared/dto/ChannelDto';

import { DynamoDBClient, QueryCommandInput, AttributeValue } from '@aws-sdk/client-dynamodb';

import ChannelFactory from './ChannelFactory';

import { EPGProgramsParameters } from '../../shared/dto/EPGDto';
import Asset from '../../shared/interfaces/Asset';

interface ChannelDocument extends ChannelRequestDto, BaseDocument {
  PK: string;
  SK: string
  'GSI1-PK': string;
  'GSI1-SK': string;
  entityType: string;
  weight?: number;
}

type IDictionnary = { [index: string]: any; };

const INTERNAL_ASSET = 'streams';

const SPECIAL_ID = 'brands';

export default class ChannelRepository extends BaseRepository implements IChannelRepository {
  static tableRelations = {
    [SortType.NAME]: {
      index: 'GSI1',
      PK: `ASSET#${ROOT_ENTITY}`,
    },
    [SortType.ID]: {
      index: 'GSI2',
      PK: `ASSET#${ROOT_ENTITY}#ID`,
    },
    [SortType.UPDATED]: {
      index: 'GSI3',
      PK: `ASSET#${ROOT_ENTITY}#UPDATED`,
    },
    [SortType.CREATED]: {
      index: 'GSI4',
      PK: `ASSET#${ROOT_ENTITY}#CREATED`,
    },
  };

  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly channelFactory: IFactory<Channel, ChannelRequestDto, ChannelDto>,
  ) {
    super(client, tableName);
    this.channelFactory = channelFactory;
  }

  private static getRootEntity(id: string, items: Record<string, any>[]) {
    const [channelItem] = items.filter((item) => item.SK === `ASSET#${ROOT_ENTITY}#${id}`);
    return channelItem as ChannelDocument;
  }

  private static ObjectToBase64(payload: object) {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private static Base64ToObject(payload: string) {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  }

  async findAll(channelsParams?: ChannelsParameters): Promise<ChannelPage> {
    try {
      // handling sort parameters
      const sort = channelsParams?.sort?.attr ?? SortType.NAME;
      const order = channelsParams?.sort?.order ?? SortOrder.ASC;

      const queryCommandInput: Omit<QueryCommandInput, 'TableName'> = {
        IndexName: ChannelRepository.tableRelations[sort].index,
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': `${ChannelRepository.tableRelations[sort].index}-PK`,
        },
        ExpressionAttributeValues: {
          ':PK': `${ChannelRepository.tableRelations[sort].PK}` as unknown as AttributeValue,
        },
        ScanIndexForward: order === SortOrder.ASC,
        Limit: channelsParams?.limit ?? 10,
        ExclusiveStartKey: channelsParams?.nextToken
          ? ChannelRepository.Base64ToObject(channelsParams.nextToken) : undefined,
      };

      if (channelsParams?.search !== undefined) {
        queryCommandInput.ExpressionAttributeNames = {
          ...queryCommandInput.ExpressionAttributeNames,
          '#name': 'searchName',
        };
        queryCommandInput.ExpressionAttributeValues = {
          ...queryCommandInput.ExpressionAttributeValues,
          ':name': channelsParams.search.toLowerCase() as unknown as AttributeValue,
        };
        queryCommandInput.FilterExpression = 'contains(#name, :name)';
      }

      if (channelsParams?.filter) {
        if (channelsParams.filter.active !== undefined) {
          queryCommandInput.ExpressionAttributeNames = {
            ...queryCommandInput.ExpressionAttributeNames,
            '#visible': 'visible',
          };
          queryCommandInput.ExpressionAttributeValues = {
            ...queryCommandInput.ExpressionAttributeValues,
            ':visible': channelsParams.filter.active as unknown as AttributeValue,
          };
          if (queryCommandInput.FilterExpression !== undefined) {
            queryCommandInput.FilterExpression = queryCommandInput.FilterExpression.concat(' and #visible = :visible');
          } else {
            queryCommandInput.FilterExpression = '#visible = :visible';
          }
        }

        const getFilterExpr = (
          relations: Array<string>,
          relationsKey: string,
          unique?: boolean,
        ) => (
          relations.map((id, idx) => {
            const attr = `${relationsKey}${idx}`;
            queryCommandInput.ExpressionAttributeNames = {
              ...queryCommandInput.ExpressionAttributeNames,
              [`#${attr}`]: relationsKey,
            };
            queryCommandInput.ExpressionAttributeValues = {
              ...queryCommandInput.ExpressionAttributeValues,
              [`:${attr}`]: id as unknown as AttributeValue,
            };

            return unique ? `#${attr} = :${attr}` : `contains(#${attr}, :${attr})`;
          })
        );
        const filtersExpr = [
          ...(channelsParams.filter.categories !== undefined ? getFilterExpr(channelsParams.filter.categories, 'categories') : []),
          ...(channelsParams.filter.packages !== undefined ? getFilterExpr(channelsParams.filter.packages, 'packages') : []),
          ...(channelsParams.filter.platforms !== undefined ? getFilterExpr(channelsParams.filter.platforms, 'platforms') : []),
        ];
        if (channelsParams.filter.providers && channelsParams.filter.providers.length) {
          filtersExpr.push(
            `(${(getFilterExpr(channelsParams.filter.providers, 'provider', true)).join(' or ')})`,
          );
        }

        if (filtersExpr.length) {
          const expr = filtersExpr.join(' and ');

          if (queryCommandInput.FilterExpression !== undefined) {
            queryCommandInput.FilterExpression = queryCommandInput.FilterExpression.concat(` and ${expr}`);
          } else {
            queryCommandInput.FilterExpression = expr;
          }
        }
      }

      const { Items, LastEvaluatedKey } = await this.query(queryCommandInput);
      const channels = await Promise.all((Items as ChannelDocument[])?.map(
        async (item: ChannelDocument) => (this.channelFactory as ChannelFactory).toDomain({
          ...item,
          exclude: channelsParams?.exclude,
        }, channelsParams?.filter?.programs),
      ));
      return {
        channels,
        nextToken: LastEvaluatedKey
          ? ChannelRepository.ObjectToBase64(LastEvaluatedKey) : undefined,
      };
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async findMany(ids: Array<string>): Promise<Array<Channel>> {
    try {
      const Items = await this.batchGetItem(ids.map((id) => ({
        PK: `ASSET#${ROOT_ENTITY}#${id}`,
        SK: `ASSET#${ROOT_ENTITY}#${id}`,
      })));
      return await Promise.all((Items as ChannelDocument[])?.map(
        async (item: ChannelDocument) => this.channelFactory.toDomain(item),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async findOne(id: string, programsFilters?: EPGProgramsParameters): Promise<Channel | undefined> {
    try {
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${ROOT_ENTITY}#${id}`,
          ':SK': 'ASSET#',
        },
      });
      if (!Items?.length) return undefined;
      const channelItem = ChannelRepository.getRootEntity(id, Items);
      return await (this.channelFactory as ChannelFactory)
        .toDomain(channelItem as ChannelDocument, programsFilters);
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async hasRelationships(item: Channel): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${ROOT_ENTITY}#${item.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  private getAffiliationDocuments(
    item: Channel & IDictionnary,
    affiliationKey: string,
    affiliationType: string,
    onlyPrimary?: boolean,
  ) {
    if (onlyPrimary) {
      const docs = Array.from(item[affiliationKey] ?? [] as Array<Asset>)
        .map((affiliatedItem: any) => ({
          PK: `ASSET#${ROOT_ENTITY}#${item.id}`,
          SK: `ASSET#${affiliationType}#${affiliationKey === SPECIAL_ID ? affiliatedItem.slug : affiliatedItem.id}`,
        }));

      if (affiliationKey === INTERNAL_ASSET) {
        item[affiliationKey]?.forEach((affiliatedItem) => {
          docs.push({
            PK: `ASSET#${affiliationType}#${affiliatedItem.id}`,
            SK: `ASSET#${affiliationType}#${affiliatedItem.id}`,
          });
        });
      }
      return docs;
    }
    return Array.from(item[affiliationKey] ?? [] as Array<Asset>)
      .map((affiliatedItem: any) => ({
        id: affiliationKey === SPECIAL_ID ? affiliatedItem.siteId : affiliatedItem.id,
        PK: `ASSET#${ROOT_ENTITY}#${item.id}`,
        SK: `ASSET#${affiliationType}#${affiliationKey === SPECIAL_ID ? affiliatedItem.slug : affiliatedItem.id}`,
        'GSI1-PK': `ASSET#${affiliationType}#${affiliationKey === SPECIAL_ID ? affiliatedItem.slug : affiliatedItem.id}`,
        'GSI1-SK': `ASSET#${ROOT_ENTITY}#${item.id}`,
        entityType: ROOT_ENTITY,
        weight: affiliatedItem.weight,
      }));
  }

  private getAffiliationDocument(
    itemId: string,
    affiliationId: string,
    affiliationType: string,
    onlyPrimary?: boolean,
  ) {
    if (onlyPrimary) {
      return {
        PK: `ASSET#${ROOT_ENTITY}#${itemId}`,
        SK: `ASSET#${affiliationType}#${affiliationId}`,
      };
    }
    return {
      id: affiliationId,
      PK: `ASSET#${ROOT_ENTITY}#${itemId}`,
      SK: `ASSET#${affiliationType}#${affiliationId}`,
      'GSI1-PK': `ASSET#${affiliationType}#${affiliationId}`,
      'GSI1-SK': `ASSET#${ROOT_ENTITY}#${itemId}`,
      entityType: ROOT_ENTITY,
    };
  }

  async save(item: Channel): Promise<boolean> {
    try {
      const channelItem = this.channelFactory.toPersistence(item);
      const channelDocument = {
        PK: `ASSET#${ROOT_ENTITY}#${item.id}`,
        SK: `ASSET#${ROOT_ENTITY}#${item.id}`,
        [`${ChannelRepository.tableRelations[SortType.NAME].index}-PK`]: ChannelRepository.tableRelations[SortType.NAME].PK,
        [`${ChannelRepository.tableRelations[SortType.NAME].index}-SK`]: item.name.toLowerCase(),
        [`${ChannelRepository.tableRelations[SortType.ID].index}-PK`]: ChannelRepository.tableRelations[SortType.ID].PK,
        [`${ChannelRepository.tableRelations[SortType.ID].index}-SK`]: item.slug.toLowerCase(),
        [`${ChannelRepository.tableRelations[SortType.UPDATED].index}-PK`]: ChannelRepository.tableRelations[SortType.UPDATED].PK,
        [`${ChannelRepository.tableRelations[SortType.UPDATED].index}-SK`]: item.updatedAt,
        [`${ChannelRepository.tableRelations[SortType.CREATED].index}-PK`]: ChannelRepository.tableRelations[SortType.CREATED].PK,
        [`${ChannelRepository.tableRelations[SortType.CREATED].index}-SK`]: item.createdAt,
        entityType: ROOT_ENTITY,
        searchName: item.name.toLowerCase(),
        searchSlug: item.slug.toLowerCase(),
        ...channelItem,
      };
      const provider = channelItem.provider !== '' ? [this.getAffiliationDocument(item.id, channelItem.provider, 'PROVIDER')] : [];
      const epg = channelItem.epg !== undefined && channelItem.epg !== '' ? [this.getAffiliationDocument(item.id, channelItem.epg, 'EPG')] : [];

      await this.batchWriteItem([
        channelDocument,
        ...provider,
        ...epg,
        ...this.getAffiliationDocuments(item, 'platforms', 'PLATFORM'),
        ...this.getAffiliationDocuments(item, 'categories', 'CATEGORY'),
        ...this.getAffiliationDocuments(item, 'packages', 'PACKAGE'),
        ...this.getAffiliationDocuments(item, 'genres', 'GENRE'),
        ...this.getAffiliationDocuments(item, 'locations', 'LOCATION'),
        ...this.getAffiliationDocuments(item, 'streams', 'STREAM'),
        ...this.getAffiliationDocuments(item, 'distributors', 'DISTRIBUTOR'),
        ...this.getAffiliationDocuments(item, 'brands', 'BRAND'),
      ]);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(item: Channel): Promise<boolean> {
    try {
      const channelItem = this.channelFactory.toPersistence(item);
      const rootDocument = {
        PK: `ASSET#${ROOT_ENTITY}#${channelItem.id}`,
        SK: `ASSET#${ROOT_ENTITY}#${channelItem.id}`,
      };
      const provider = channelItem.provider !== '' ? [this.getAffiliationDocument(item.id, channelItem.provider, 'PROVIDER', true)] : [];
      const epg = channelItem.epg !== undefined && channelItem.epg !== '' ? [this.getAffiliationDocument(item.id, channelItem.epg, 'EPG', true)] : [];
      return !!await this.batchDeleteDocuments([
        rootDocument,
        ...provider,
        ...epg,
        ...this.getAffiliationDocuments(item, 'platforms', 'PLATFORM', true),
        ...this.getAffiliationDocuments(item, 'categories', 'CATEGORY', true),
        ...this.getAffiliationDocuments(item, 'packages', 'PACKAGE', true),
        ...this.getAffiliationDocuments(item, 'genres', 'GENRE', true),
        ...this.getAffiliationDocuments(item, 'locations', 'LOCATION', true),
        ...this.getAffiliationDocuments(item, 'streams', 'STREAM', true),
        ...this.getAffiliationDocuments(item, 'distributors', 'DISTRIBUTOR', true),
        ...this.getAffiliationDocuments(item, 'brands', 'BRAND', true),
      ]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(item: Channel): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        FilterExpression: '#slug = :slug',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#slug': 'searchSlug',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${ROOT_ENTITY}`,
          ':slug': item.slug.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }
}
