import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { SeriesPage, ISeriesRepository } from './ISeriesRepository';
import Series from './Series';

import { IFactory } from '../../../shared/interfaces/IFactory';
import { BaseDocument } from '../../../shared/interfaces/BaseDocument';
import { SeriesRequestDto, SeriesDto } from '../../../shared/dto/vod/SeriesDto';
import { SortOrder, SortType } from '../../../shared/dto/ChannelDto';
import { VodParameters } from '../../../shared/dto/vod/VodDto';

import { DynamoDBClient, QueryCommandInput, AttributeValue } from '@aws-sdk/client-dynamodb';

import SeriesFactory from './SeriesFactory';

import Asset from 'routes/shared/interfaces/Asset';

interface SeriesDocument extends SeriesRequestDto, BaseDocument {
  PK: string;
  SK: string
  'GSI1-PK': string;
  'GSI1-SK': string;
  entityType: string;
  weight?: number;
}

type IDictionnary = { [index: string]: any; };

export default class SeriesRepository extends BaseRepository implements ISeriesRepository {
  static SPECIAL_ID = 'brands';

  static ROOT_ENTITY = 'SERIES';

  static tableRelations = {
    [SortType.NAME]: {
      index: 'GSI1',
      PK: `ASSET#${SeriesFactory.ROOT_ENTITY}`,
    },
    [SortType.ID]: {
      index: 'GSI2',
      PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#ID`,
    },
    [SortType.UPDATED]: {
      index: 'GSI3',
      PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#UPDATED`,
    },
    [SortType.CREATED]: {
      index: 'GSI4',
      PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#CREATED`,
    },
  };

  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly seriesFactory: IFactory<Series, SeriesRequestDto, SeriesDto>,
  ) {
    super(client, tableName);
    this.seriesFactory = seriesFactory;
  }

  getFactory(): SeriesFactory {
    return this.seriesFactory as SeriesFactory;
  }

  async appendEpisodes(seriesId: string, episodes: Array<string>)
    : Promise<boolean> {
    try {
      return !!await this.updateItem({
        Key: {
          PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${seriesId}`,
          SK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${seriesId}`,
        },
        UpdateExpression: 'set episodes = list_append(episodes, :episodes), updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':episodes': episodes,
          ':updatedAt': new Date().toISOString(),
        },
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async updateEpisodes(seriesId: string, episodes: Array<string>)
    : Promise<boolean> {
    try {
      return !!await this.updateItem({
        Key: {
          PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${seriesId}`,
          SK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${seriesId}`,
        },
        UpdateExpression: 'set episodes = :episodes, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':episodes': episodes,
          ':updatedAt': new Date().toISOString(),
        },
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  private static getRootEntity(id: string, items: Record<string, any>[]) {
    const [seriesItem] = items.filter((item) => item.SK === `ASSET#${SeriesFactory.ROOT_ENTITY}#${id}`);
    return seriesItem as SeriesDocument;
  }

  private static ObjectToBase64(payload: object) {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private static Base64ToObject(payload: string) {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  }

  async findAll(seriesParams?: VodParameters): Promise<SeriesPage> {
    try {
      // handling sort parameters
      const sort = seriesParams?.sort?.attr ?? SortType.NAME;
      const order = seriesParams?.sort?.order ?? SortOrder.ASC;

      const queryCommandInput: Omit<QueryCommandInput, 'TableName'> = {
        IndexName: SeriesRepository.tableRelations[sort].index,
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': `${SeriesRepository.tableRelations[sort].index}-PK`,
        },
        ExpressionAttributeValues: {
          ':PK': `${SeriesRepository.tableRelations[sort].PK}` as unknown as AttributeValue,
        },
        ScanIndexForward: order === SortOrder.ASC,
        Limit: seriesParams?.limit ?? 10,
        ExclusiveStartKey: seriesParams?.nextToken
          ? SeriesRepository.Base64ToObject(seriesParams.nextToken) : undefined,
      };

      if (seriesParams?.search !== undefined) {
        queryCommandInput.ExpressionAttributeNames = {
          ...queryCommandInput.ExpressionAttributeNames,
          '#name': 'searchName',
        };
        queryCommandInput.ExpressionAttributeValues = {
          ...queryCommandInput.ExpressionAttributeValues,
          ':name': seriesParams.search.toLowerCase() as unknown as AttributeValue,
        };
        queryCommandInput.FilterExpression = 'contains(#name, :name)';
      }

      if (seriesParams?.filter) {

        if (seriesParams.filter.active !== undefined) {
          queryCommandInput.ExpressionAttributeNames = {
            ...queryCommandInput.ExpressionAttributeNames,
            '#enabled': 'enabled',
          };
          queryCommandInput.ExpressionAttributeValues = {
            ...queryCommandInput.ExpressionAttributeValues,
            // @ts-ignore
            ':enabledValue': seriesParams.filter.active,
          };
          const filterActive = '#enabled = :enabledValue';
          if (queryCommandInput.FilterExpression !== undefined) {
            queryCommandInput.FilterExpression = queryCommandInput.FilterExpression.concat(` and ${filterActive}`);
          } else {
            queryCommandInput.FilterExpression = filterActive;
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
          ...(seriesParams.filter.categories !== undefined ? getFilterExpr(seriesParams.filter.categories, 'categories') : []),
          ...(seriesParams.filter.packages !== undefined ? getFilterExpr(seriesParams.filter.packages, 'packages') : []),
          ...(seriesParams.filter.platforms !== undefined ? getFilterExpr(seriesParams.filter.platforms, 'platforms') : []),
        ];
        if (seriesParams.filter.providers && seriesParams.filter.providers.length) {
          filtersExpr.push(
            `(${(getFilterExpr(seriesParams.filter.providers, 'provider', true)).join(' or ')})`,
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
      const series = await Promise.all((Items as SeriesDocument[])?.map(
        async (item: SeriesDocument) => this.seriesFactory.toDomain({
          ...item,
          exclude: seriesParams?.exclude,
        }),
      ));
      return {
        series,
        nextToken: LastEvaluatedKey
          ? SeriesRepository.ObjectToBase64(LastEvaluatedKey) : undefined,
      };
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async findMany(ids: Array<string>, exclude?: string): Promise<Array<Series>> {
    try {
      const Items = await this.batchGetItem(ids.map((id) => ({
        PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${id}`,
        SK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${id}`,
      })));
      return await Promise.all((Items as SeriesDocument[])?.map(
        async (item: SeriesDocument) => this.seriesFactory.toDomain({ ...item, exclude }),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async findOne(id: string): Promise<Series | undefined> {
    try {
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${SeriesFactory.ROOT_ENTITY}#${id}`,
          ':SK': `ASSET#${SeriesFactory.ROOT_ENTITY}`,
        },
      });
      if (!Items?.length) return undefined;
      const seriesItem = SeriesRepository.getRootEntity(id, Items);
      return await this.seriesFactory.toDomain(seriesItem as SeriesDocument);
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async findBy(attribute: string, search: string): Promise<Array<Series>> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        FilterExpression: '#attr = :searchAttr',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#attr': attribute,
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${SeriesFactory.ROOT_ENTITY}`,
          ':searchAttr': search,
        },
      });
      return await Promise.all(await Items?.map(
        async (seriesItem) => this.seriesFactory.toDomain(seriesItem as SeriesDocument),
      ) ?? []);
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async hasRelationships(item: Series): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${SeriesFactory.ROOT_ENTITY}#${item.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  private getAffiliationDocuments(
    item: Series & IDictionnary,
    affiliationKey: string,
    affiliationType: string,
    onlyPrimary?: boolean,
  ) {
    if (onlyPrimary) {
      return Array.from(item[affiliationKey] ?? [] as Array<Asset>)
        .map((affiliatedItem: any) => ({
          PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${item.id}`,
          SK: `ASSET#${affiliationType}#${affiliationKey === SeriesRepository.SPECIAL_ID ? affiliatedItem.slug : affiliatedItem.id}`,
        }));
    }
    return Array.from(item[affiliationKey] ?? [] as Array<Asset>).map((affiliatedItem: any) => ({
      id: affiliationKey === SeriesRepository.SPECIAL_ID
        ? affiliatedItem.siteId : affiliatedItem.id,
      PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${item.id}`,
      SK: `ASSET#${affiliationType}#${affiliationKey === SeriesRepository.SPECIAL_ID ? affiliatedItem.slug : affiliatedItem.id}`,
      'GSI1-PK': `ASSET#${affiliationType}#${affiliationKey === SeriesRepository.SPECIAL_ID ? affiliatedItem.slug : affiliatedItem.id}`,
      'GSI1-SK': `ASSET#${SeriesFactory.ROOT_ENTITY}#${item.id}`,
      entityType: SeriesFactory.ROOT_ENTITY,
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
        PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${itemId}`,
        SK: `ASSET#${affiliationType}#${affiliationId}`,
      };
    }
    return {
      id: affiliationId,
      PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${itemId}`,
      SK: `ASSET#${affiliationType}#${affiliationId}`,
      'GSI1-PK': `ASSET#${affiliationType}#${affiliationId}`,
      'GSI1-SK': `ASSET#${SeriesFactory.ROOT_ENTITY}#${itemId}`,
      entityType: SeriesFactory.ROOT_ENTITY,
    };
  }

  async save(item: Series): Promise<boolean> {
    try {
      const seriesItem = this.seriesFactory.toPersistence(item);
      const seriesDocument = {
        PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${item.id}`,
        SK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${item.id}`,
        [`${SeriesRepository.tableRelations[SortType.NAME].index}-PK`]: SeriesRepository.tableRelations[SortType.NAME].PK,
        [`${SeriesRepository.tableRelations[SortType.NAME].index}-SK`]: item.name.toLowerCase(),
        [`${SeriesRepository.tableRelations[SortType.ID].index}-PK`]: SeriesRepository.tableRelations[SortType.ID].PK,
        [`${SeriesRepository.tableRelations[SortType.ID].index}-SK`]: item.slug.toLowerCase(),
        [`${SeriesRepository.tableRelations[SortType.UPDATED].index}-PK`]: SeriesRepository.tableRelations[SortType.UPDATED].PK,
        [`${SeriesRepository.tableRelations[SortType.UPDATED].index}-SK`]: item.updatedAt,
        [`${SeriesRepository.tableRelations[SortType.CREATED].index}-PK`]: SeriesRepository.tableRelations[SortType.CREATED].PK,
        [`${SeriesRepository.tableRelations[SortType.CREATED].index}-SK`]: item.createdAt,
        entityType: SeriesFactory.ROOT_ENTITY,
        searchName: item.name.toLowerCase(),
        searchSlug: item.slug.toLowerCase(),
        ...seriesItem,
      };
      const provider = seriesItem.provider !== '' ? [this.getAffiliationDocument(item.id, seriesItem.provider, 'PROVIDER')] : [];

      await this.batchWriteItem([
        seriesDocument,
        ...provider,
        ...this.getAffiliationDocuments(item, 'platforms', 'PLATFORM'),
        ...this.getAffiliationDocuments(item, 'categories', 'CATEGORY'),
        ...this.getAffiliationDocuments(item, 'packages', 'PACKAGE'),
        ...this.getAffiliationDocuments(item, 'genres', 'GENRE'),
        ...this.getAffiliationDocuments(item, 'locations', 'LOCATION'),
        ...this.getAffiliationDocuments(item, 'episodes', 'EPISODE'),
        ...this.getAffiliationDocuments(item, 'distributors', 'DISTRIBUTOR'),
        ...this.getAffiliationDocuments(item, 'brands', 'BRAND'),
      ]);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async batchSave(items: Series[]) {
    try {
      const formedSeries = items.map((item) => {
        const seriesItem = this.seriesFactory.toPersistence(item);
        const seriesDocument = {
          PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${item.id}`,
          SK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${item.id}`,
          [`${SeriesRepository.tableRelations[SortType.NAME].index}-PK`]: SeriesRepository.tableRelations[SortType.NAME].PK,
          [`${SeriesRepository.tableRelations[SortType.NAME].index}-SK`]: item.name.toLowerCase(),
          [`${SeriesRepository.tableRelations[SortType.ID].index}-PK`]: SeriesRepository.tableRelations[SortType.ID].PK,
          [`${SeriesRepository.tableRelations[SortType.ID].index}-SK`]: item.slug.toLowerCase(),
          [`${SeriesRepository.tableRelations[SortType.UPDATED].index}-PK`]: SeriesRepository.tableRelations[SortType.UPDATED].PK,
          [`${SeriesRepository.tableRelations[SortType.UPDATED].index}-SK`]: item.updatedAt,
          [`${SeriesRepository.tableRelations[SortType.CREATED].index}-PK`]: SeriesRepository.tableRelations[SortType.CREATED].PK,
          [`${SeriesRepository.tableRelations[SortType.CREATED].index}-SK`]: item.createdAt,
          entityType: SeriesFactory.ROOT_ENTITY,
          searchName: item.name.toLowerCase(),
          searchSlug: item.slug.toLowerCase(),
          ...seriesItem,
        };
        const provider = seriesItem.provider !== '' ? [this.getAffiliationDocument(item.id, seriesItem.provider, 'PROVIDER')] : [];

        return [
          seriesDocument,
          ...provider,
          ...this.getAffiliationDocuments(item, 'platforms', 'PLATFORM'),
          ...this.getAffiliationDocuments(item, 'categories', 'CATEGORY'),
          ...this.getAffiliationDocuments(item, 'packages', 'PACKAGE'),
          ...this.getAffiliationDocuments(item, 'genres', 'GENRE'),
          ...this.getAffiliationDocuments(item, 'locations', 'LOCATION'),
          ...this.getAffiliationDocuments(item, 'episodes', 'EPISODE'),
          ...this.getAffiliationDocuments(item, 'distributors', 'DISTRIBUTOR'),
          ...this.getAffiliationDocuments(item, 'brands', 'BRAND'),
        ];
      });
      const flattened = formedSeries.flat(2);
      await this.batchWriteItem(flattened);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(item: Series): Promise<boolean> {
    try {
      const seriesItem = this.seriesFactory.toPersistence(item);
      const rootDocument = {
        PK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${seriesItem.id}`,
        SK: `ASSET#${SeriesFactory.ROOT_ENTITY}#${seriesItem.id}`,
      };
      const provider = seriesItem.provider !== '' ? [this.getAffiliationDocument(item.id, seriesItem.provider, 'PROVIDER', true)] : [];
      return !!await this.batchDeleteDocuments([
        rootDocument,
        ...provider,
        ...this.getAffiliationDocuments(item, 'platforms', 'PLATFORM', true),
        ...this.getAffiliationDocuments(item, 'categories', 'CATEGORY', true),
        ...this.getAffiliationDocuments(item, 'packages', 'PACKAGE', true),
        ...this.getAffiliationDocuments(item, 'genres', 'GENRE', true),
        ...this.getAffiliationDocuments(item, 'locations', 'LOCATION', true),
        ...this.getAffiliationDocuments(item, 'episodes', 'EPISODE', true),
        ...this.getAffiliationDocuments(item, 'distributors', 'DISTRIBUTOR', true),
        ...this.getAffiliationDocuments(item, 'brands', 'BRAND', true),
      ]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(item: Series): Promise<boolean> {
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
          ':PK': `ASSET#${SeriesFactory.ROOT_ENTITY}`,
          ':slug': item.slug.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }
}
