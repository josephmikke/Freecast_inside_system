import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { EpisodePage, IEpisodeRepository } from './IEpisodeRepository';
import Episode from './Episode';

import { IFactory } from '../../../shared/interfaces/IFactory';
import { BaseDocument } from '../../../shared/interfaces/BaseDocument';
import { EpisodeRequestDto, EpisodeDto, EpisodeParameters } from '../../../shared/dto/vod/EpisodeDto';
import Stream from '../../../stream/shared/Stream';
import { SortOrder, SortType } from '../../../shared/dto/ChannelDto';

import { DynamoDBClient, QueryCommandInput, AttributeValue } from '@aws-sdk/client-dynamodb';

import EpisodeFactory from './EpisodeFactory';

interface EpisodeDocument extends EpisodeRequestDto, BaseDocument {
  PK: string;
  SK: string
  'GSI1-PK': string;
  'GSI1-SK': string;
  entityType: string;
}

type IDictionnary = { [index: string]: any; };
type EpisodeDtoAccess = EpisodeDto & IDictionnary;

export default class EpisodeRepository extends BaseRepository implements IEpisodeRepository {
  static ROOT_ENTITY = 'EPISODE';

  static PARENT_ENTITY = 'SERIES';

  static INTERNAL_ASSET = 'streams';

  static tableRelations = {
    [SortType.NAME]: {
      index: 'GSI1',
      PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}`,
    },
    [SortType.ID]: {
      index: 'GSI2',
      PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#ID`,
    },
    [SortType.UPDATED]: {
      index: 'GSI3',
      PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#UPDATED`,
    },
    [SortType.CREATED]: {
      index: 'GSI4',
      PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#CREATED`,
    },
  };

  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly episodeFactory: IFactory<Episode, EpisodeRequestDto, EpisodeDto>,
  ) {
    super(client, tableName);
    this.episodeFactory = episodeFactory;
  }

  getFactory(): EpisodeFactory {
    return this.episodeFactory as EpisodeFactory;
  }

  private static getRootEntity(id: string, items: Record<string, any>[]) {
    const [episodeItem] = items.filter((item) => item.SK === `ASSET#${EpisodeRepository.ROOT_ENTITY}#${id}`);
    return episodeItem as EpisodeDocument;
  }

  private static ObjectToBase64(payload: object) {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private static Base64ToObject(payload: string) {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  }

  async findAll(episodesParams?: EpisodeParameters): Promise<EpisodePage> {
    try {
      // handling sort parameters
      const sort = episodesParams?.sort?.attr ?? SortType.NAME;
      const order = episodesParams?.sort?.order ?? SortOrder.ASC;

      const queryCommandInput: Omit<QueryCommandInput, 'TableName'> = {
        IndexName: EpisodeRepository.tableRelations[sort].index,
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': `${EpisodeRepository.tableRelations[sort].index}-PK`,
        },
        ExpressionAttributeValues: {
          ':PK': `${EpisodeRepository.tableRelations[sort].PK}` as unknown as AttributeValue,
        },
        ScanIndexForward: order === SortOrder.ASC,
        Limit: episodesParams?.limit ?? 10,
        ExclusiveStartKey: episodesParams?.nextToken
          ? EpisodeRepository.Base64ToObject(episodesParams.nextToken) : undefined,
      };

      if (episodesParams?.search !== undefined) {
        queryCommandInput.ExpressionAttributeNames = {
          ...queryCommandInput.ExpressionAttributeNames,
          '#name': 'searchName',
        };
        queryCommandInput.ExpressionAttributeValues = {
          ...queryCommandInput.ExpressionAttributeValues,
          ':name': episodesParams.search.toLowerCase() as unknown as AttributeValue,
        };
        queryCommandInput.FilterExpression = 'contains(#name, :name)';
      }

      if (episodesParams?.filter) {
        if (episodesParams.filter.active !== undefined) {
          queryCommandInput.ExpressionAttributeNames = {
            ...queryCommandInput.ExpressionAttributeNames,
            '#availableDate': 'availableDate',
            '#expirationDate': 'expirationDate',
          };
          queryCommandInput.ExpressionAttributeValues = {
            ...queryCommandInput.ExpressionAttributeValues,
            ':actualDate': new Date().toISOString() as unknown as AttributeValue,
          };
          const filterActive = episodesParams.filter.active
            ? '#availableDate <= :actualDate and #expirationDate > :actualDate'
            : '#availableDate > :actualDate or #expirationDate <= :actualDate';
          if (queryCommandInput.FilterExpression !== undefined) {
            queryCommandInput.FilterExpression = queryCommandInput.FilterExpression.concat(` and ${filterActive}`);
          } else {
            queryCommandInput.FilterExpression = filterActive;
          }
        }
      }

      const { Items, LastEvaluatedKey } = await this.query(queryCommandInput);
      const episodes = await Promise.all((Items as EpisodeDocument[])?.map(
        async (item: EpisodeDocument) => this.episodeFactory.toDomain(item),
      ));
      return {
        episodes,
        nextToken: LastEvaluatedKey
          ? EpisodeRepository.ObjectToBase64(LastEvaluatedKey) : undefined,
      };
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async findMany(ids: Array<string>): Promise<Array<Episode>> {
    try {
      const Items = await this.batchGetItem(ids.map((id) => ({
        PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${id}`,
        SK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${id}`,
      })));
      return await Promise.all((Items as EpisodeDocument[])?.map(
        async (item: EpisodeDocument) => this.episodeFactory.toDomain(item),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async findOne(id: string): Promise<Episode | undefined> {
    try {
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${EpisodeRepository.ROOT_ENTITY}#${id}`,
          ':SK': 'ASSET#',
        },
      });
      if (!Items?.length) return undefined;
      const episodeItem = EpisodeRepository.getRootEntity(id, Items);
      return await this.episodeFactory.toDomain(episodeItem as EpisodeDocument);
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async hasRelationships(item: Episode): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${EpisodeRepository.ROOT_ENTITY}#${item.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  private getAffiliationDocuments(
    item: EpisodeDtoAccess,
    affiliationKey: string,
    affiliationType: string,
    onlyPrimary?: boolean,
  ) {
    if (onlyPrimary) {
      const docs = Array.from(item[affiliationKey] ?? [] as Array<string>)
        .map((affiliatedItemId) => ({
          PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${item.id}`,
          SK: `ASSET#${affiliationType}#${affiliatedItemId}`,
        }));

      if (affiliationKey === EpisodeRepository.INTERNAL_ASSET) {
        item[affiliationKey].forEach((affiliatedItemId: string) => {
          docs.push({
            PK: `ASSET#${affiliationType}#${affiliatedItemId}`,
            SK: `ASSET#${affiliationType}#${affiliatedItemId}`,
          });
        });
      }
      return docs;
    }
    return Array.from(item[affiliationKey] ?? [] as Array<string>).map((affiliatedItemId) => ({
      id: affiliatedItemId,
      PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${item.id}`,
      SK: `ASSET#${affiliationType}#${affiliatedItemId}`,
      'GSI1-PK': `ASSET#${affiliationType}#${affiliatedItemId}`,
      'GSI1-SK': `ASSET#${EpisodeRepository.ROOT_ENTITY}#${item.id}`,
      entityType: EpisodeRepository.ROOT_ENTITY,
    }));
  }

  private getAffiliationParentDocument(
    parentId: string,
    itemId: string,
    onlyPrimary?: boolean,
  ) {
    if (onlyPrimary) {
      return {
        PK: `ASSET#${EpisodeRepository.PARENT_ENTITY}#${parentId}`,
        SK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${itemId}`,
      };
    }
    return {
      id: itemId,
      PK: `ASSET#${EpisodeRepository.PARENT_ENTITY}#${parentId}`,
      SK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${itemId}`,
      'GSI1-PK': `ASSET#${EpisodeRepository.PARENT_ENTITY}#${parentId}`,
      'GSI1-SK': `ASSET#${EpisodeRepository.ROOT_ENTITY}#${itemId}`,
      entityType: EpisodeRepository.PARENT_ENTITY,
    };
  }

  private getAffiliationDocument(
    itemId: string,
    affiliationId: string,
    affiliationType: string,
    onlyPrimary?: boolean,
  ) {
    if (onlyPrimary) {
      return {
        PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${itemId}`,
        SK: `ASSET#${affiliationType}#${affiliationId}`,
      };
    }
    return {
      id: affiliationId,
      PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${itemId}`,
      SK: `ASSET#${affiliationType}#${affiliationId}`,
      'GSI1-PK': `ASSET#${affiliationType}#${affiliationId}`,
      'GSI1-SK': `ASSET#${EpisodeRepository.ROOT_ENTITY}#${itemId}`,
      entityType: EpisodeRepository.ROOT_ENTITY,
    };
  }

  async saveStreamRelation(item: Episode, stream: Stream) {
    await this.updateItem({
      Key: {
        PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${item.id}`,
        SK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${item.id}`,
      },
      UpdateExpression: 'set streams = list_append(streams, :streamId), updatedAt = :updatedAt, enabled = :enabled',
      ExpressionAttributeValues: {
        ':streamId': [stream.id],
        ':updatedAt': new Date().toISOString(),
        ':enabled': true,
      },
    });
    await this.batchWriteItem([
      this.getAffiliationDocument(item.id, stream.id, 'STREAM'),
    ]);
  }

  async appendMediapackageId(id: string, mediapackageId: string): Promise<void> {
    try {
      await this.updateItem({
        Key: {
          PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${id}`,
          SK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${id}`,
        },
        UpdateExpression: 'set mediapackageIds = list_append(if_not_exists(mediapackageIds, :empty), :id), updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':id': [mediapackageId],
          ':empty': [],
          ':updatedAt': new Date().toISOString(),
        },
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(item: Episode): Promise<boolean> {
    try {
      const episodeItem = this.episodeFactory.toPersistence(item);
      const episodeDocument = {
        PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${item.id}`,
        SK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${item.id}`,
        [`${EpisodeRepository.tableRelations[SortType.NAME].index}-PK`]: EpisodeRepository.tableRelations[SortType.NAME].PK,
        [`${EpisodeRepository.tableRelations[SortType.NAME].index}-SK`]: item.name.toLowerCase(),
        [`${EpisodeRepository.tableRelations[SortType.ID].index}-PK`]: EpisodeRepository.tableRelations[SortType.ID].PK,
        [`${EpisodeRepository.tableRelations[SortType.ID].index}-SK`]: item.slug.toLowerCase(),
        [`${EpisodeRepository.tableRelations[SortType.UPDATED].index}-PK`]: EpisodeRepository.tableRelations[SortType.UPDATED].PK,
        [`${EpisodeRepository.tableRelations[SortType.UPDATED].index}-SK`]: item.updatedAt,
        [`${EpisodeRepository.tableRelations[SortType.CREATED].index}-PK`]: EpisodeRepository.tableRelations[SortType.CREATED].PK,
        [`${EpisodeRepository.tableRelations[SortType.CREATED].index}-SK`]: item.createdAt,
        entityType: EpisodeRepository.ROOT_ENTITY,
        searchName: item.name.toLowerCase(),
        searchSlug: item.slug.toLowerCase(),
        ...episodeItem,
      };

      const docs = await [
        episodeDocument,
        ...this.getAffiliationDocuments(episodeItem, 'streams', 'STREAM'),
      ];

      if (episodeItem.seriesId !== null && episodeItem.seriesId.length > 0) {
        docs.push(this.getAffiliationParentDocument(episodeItem.seriesId, item.id));
      }

      await this.batchWriteItem(docs);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async batchSave(items: Episode[], size?: number) {
    try {
      const formedEpisodes = items.map((item) => {
        const episodeItem = this.episodeFactory.toPersistence(item);
        const episodeDocument = {
          PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${item.id}`,
          SK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${item.id}`,
          [`${EpisodeRepository.tableRelations[SortType.NAME].index}-PK`]: EpisodeRepository.tableRelations[SortType.NAME].PK,
          [`${EpisodeRepository.tableRelations[SortType.NAME].index}-SK`]: item.name.toLowerCase(),
          [`${EpisodeRepository.tableRelations[SortType.ID].index}-PK`]: EpisodeRepository.tableRelations[SortType.ID].PK,
          [`${EpisodeRepository.tableRelations[SortType.ID].index}-SK`]: item.slug.toLowerCase(),
          [`${EpisodeRepository.tableRelations[SortType.UPDATED].index}-PK`]: EpisodeRepository.tableRelations[SortType.UPDATED].PK,
          [`${EpisodeRepository.tableRelations[SortType.UPDATED].index}-SK`]: item.updatedAt,
          [`${EpisodeRepository.tableRelations[SortType.CREATED].index}-PK`]: EpisodeRepository.tableRelations[SortType.CREATED].PK,
          [`${EpisodeRepository.tableRelations[SortType.CREATED].index}-SK`]: item.createdAt,
          entityType: EpisodeRepository.ROOT_ENTITY,
          searchName: item.name.toLowerCase(),
          searchSlug: item.slug.toLowerCase(),
          ...episodeItem,
        };

        const docs = [episodeDocument, ...this.getAffiliationDocuments(episodeItem, 'streams', 'STREAM')];

        if (episodeItem.seriesId !== null && episodeItem.seriesId.length > 0) {
          docs.push(this.getAffiliationParentDocument(episodeItem.seriesId, item.id));
        }
        return docs;
      });
      const flattened = formedEpisodes.flat(2);
      await this.batchWriteItem(flattened, size);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(item: Episode): Promise<boolean> {
    try {
      const episodeItem = this.episodeFactory.toPersistence(item);
      const rootDocument = {
        PK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${episodeItem.id}`,
        SK: `ASSET#${EpisodeRepository.ROOT_ENTITY}#${episodeItem.id}`,
      };

      const docs = await [
        rootDocument,
        ...this.getAffiliationDocuments(episodeItem, 'streams', 'STREAM', true),
      ];

      if (episodeItem.seriesId !== null && episodeItem.seriesId.length > 0) {
        docs.push(this.getAffiliationParentDocument(episodeItem.seriesId, item.id, true));
      }

      return !!await this.batchDeleteDocuments(docs);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(item: Episode): Promise<boolean> {
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
          ':PK': `ASSET#${EpisodeRepository.ROOT_ENTITY}`,
          ':slug': item.slug.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }
}
