import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { MoviePage, IMovieRepository } from './IMovieRepository';
import Movie from './Movie';

import { IFactory } from '../../../shared/interfaces/IFactory';
import { BaseDocument } from '../../../shared/interfaces/BaseDocument';
import { MovieRequestDto, MovieDto } from '../../../shared/dto/vod/MovieDto';
import { SortOrder, SortType } from '../../../shared/dto/ChannelDto';
import { VodParameters } from '../../../shared/dto/vod/VodDto';
import Asset from '../../../shared/interfaces/Asset';
import Stream from '../../../stream/shared/Stream';

import { DynamoDBClient, QueryCommandInput, AttributeValue } from '@aws-sdk/client-dynamodb';

import MovieFactory from './MovieFactory';

interface MovieDocument extends MovieRequestDto, BaseDocument {
  PK: string;
  SK: string
  'GSI1-PK': string;
  'GSI1-SK': string;
  entityType: string;
  weight?: number;
}

type IDictionnary = { [index: string]: any; };

export default class MovieRepository extends BaseRepository implements IMovieRepository {
  static SPECIAL_ID = 'brands';

  static INTERNAL_ASSET = 'streams';

  static tableRelations = {
    [SortType.NAME]: {
      index: 'GSI1',
      PK: `ASSET#${MovieFactory.ROOT_ENTITY}`,
    },
    [SortType.ID]: {
      index: 'GSI2',
      PK: `ASSET#${MovieFactory.ROOT_ENTITY}#ID`,
    },
    [SortType.UPDATED]: {
      index: 'GSI3',
      PK: `ASSET#${MovieFactory.ROOT_ENTITY}#UPDATED`,
    },
    [SortType.CREATED]: {
      index: 'GSI4',
      PK: `ASSET#${MovieFactory.ROOT_ENTITY}#CREATED`,
    },
  };

  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly movieFactory: IFactory<Movie, MovieRequestDto, MovieDto>,
  ) {
    super(client, tableName);
    this.movieFactory = movieFactory;
  }

  getFactory(): MovieFactory {
    return this.movieFactory as MovieFactory;
  }

  private static getRootEntity(id: string, items: Record<string, any>[]) {
    const [movieItem] = items.filter((item) => item.SK === `ASSET#${MovieFactory.ROOT_ENTITY}#${id}`);
    return movieItem as MovieDocument;
  }

  private static ObjectToBase64(payload: object) {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private static Base64ToObject(payload: string) {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  }

  async saveStreamRelation(item: Movie, stream: Stream) {
    await this.updateItem({
      Key: {
        PK: `ASSET#${MovieFactory.ROOT_ENTITY}#${item.id}`,
        SK: `ASSET#${MovieFactory.ROOT_ENTITY}#${item.id}`,
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
          PK: `ASSET#${MovieFactory.ROOT_ENTITY}#${id}`,
          SK: `ASSET#${MovieFactory.ROOT_ENTITY}#${id}`,
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

  async findAll(moviesParams?: VodParameters): Promise<MoviePage> {
    try {
      // handling sort parameters
      const sort = moviesParams?.sort?.attr ?? SortType.NAME;
      const order = moviesParams?.sort?.order ?? SortOrder.ASC;

      const queryCommandInput: Omit<QueryCommandInput, 'TableName'> = {
        IndexName: MovieRepository.tableRelations[sort].index,
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': `${MovieRepository.tableRelations[sort].index}-PK`,
        },
        ExpressionAttributeValues: {
          ':PK': `${MovieRepository.tableRelations[sort].PK}` as unknown as AttributeValue,
        },
        ScanIndexForward: order === SortOrder.ASC,
        Limit: moviesParams?.limit ?? 10,
        ExclusiveStartKey: moviesParams?.nextToken
          ? MovieRepository.Base64ToObject(moviesParams.nextToken) : undefined,
      };

      if (moviesParams?.search !== undefined) {
        queryCommandInput.ExpressionAttributeNames = {
          ...queryCommandInput.ExpressionAttributeNames,
          '#name': 'searchName',
        };
        queryCommandInput.ExpressionAttributeValues = {
          ...queryCommandInput.ExpressionAttributeValues,
          ':name': moviesParams.search.toLowerCase() as unknown as AttributeValue,
        };
        queryCommandInput.FilterExpression = 'contains(#name, :name)';
      }

      if (moviesParams?.filter) {
        if (moviesParams.filter.active !== undefined) {
          queryCommandInput.ExpressionAttributeNames = {
            ...queryCommandInput.ExpressionAttributeNames,
            '#availableDate': 'availableDate',
            '#expirationDate': 'expirationDate',
          };
          queryCommandInput.ExpressionAttributeValues = {
            ...queryCommandInput.ExpressionAttributeValues,
            ':actualDate': new Date().toISOString() as unknown as AttributeValue,
          };
          const filterActive = moviesParams.filter.active
            ? '#availableDate <= :actualDate and #expirationDate > :actualDate'
            : '#availableDate > :actualDate or #expirationDate <= :actualDate';
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
          ...(moviesParams.filter.categories !== undefined ? getFilterExpr(moviesParams.filter.categories, 'categories') : []),
          ...(moviesParams.filter.packages !== undefined ? getFilterExpr(moviesParams.filter.packages, 'packages') : []),
          ...(moviesParams.filter.platforms !== undefined ? getFilterExpr(moviesParams.filter.platforms, 'platforms') : []),
        ];
        if (moviesParams.filter.providers && moviesParams.filter.providers.length) {
          filtersExpr.push(
            `(${(getFilterExpr(moviesParams.filter.providers, 'provider', true)).join(' or ')})`,
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
      const movies = await Promise.all((Items as MovieDocument[])?.map(
        async (item: MovieDocument) => this.movieFactory.toDomain({
          ...item,
          exclude: moviesParams?.exclude,
        }),
      ));
      return {
        movies,
        nextToken: LastEvaluatedKey
          ? MovieRepository.ObjectToBase64(LastEvaluatedKey) : undefined,
      };
    } catch (e) {
      console.log('[Movie Repository]: ', e);
      this.Logger.error(e);
      throw e;
    }
  }

  async findMany(ids: Array<string>): Promise<Array<Movie>> {
    try {
      const Items = await this.batchGetItem(ids.map((id) => ({
        PK: `ASSET#${MovieFactory.ROOT_ENTITY}#${id}`,
        SK: `ASSET#${MovieFactory.ROOT_ENTITY}#${id}`,
      })));
      return await Promise.all((Items as MovieDocument[])?.map(
        async (item: MovieDocument) => this.movieFactory.toDomain(item),
      ));
    } catch (e) {
      console.log('[Movie Repository]: ', e);
      this.Logger.error(e);
      throw e;
    }
  }

  async findOne(id: string): Promise<Movie | undefined> {
    try {
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${MovieFactory.ROOT_ENTITY}#${id}`,
          ':SK': 'ASSET#',
        },
      });
      if (!Items?.length) return undefined;
      const movieItem = MovieRepository.getRootEntity(id, Items);
      return await this.movieFactory.toDomain(movieItem as MovieDocument);
    } catch (e) {
      console.log('[Movie Repository]: ', e);
      this.Logger.error(e);
      throw e;
    }
  }

  async hasRelationships(item: Movie): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${MovieFactory.ROOT_ENTITY}#${item.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      console.log('[Movie Repository]: ', e);
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  private getAffiliationDocuments(
    item: Movie & IDictionnary,
    affiliationKey: string,
    affiliationType: string,
    onlyPrimary?: boolean,
  ) {
    if (onlyPrimary) {
      const docs = Array.from(item[affiliationKey] ?? [] as Array<Asset>)
        .map((affiliatedItem: any) => ({
          PK: `ASSET#${MovieFactory.ROOT_ENTITY}#${item.id}`,
          SK: `ASSET#${affiliationType}#${affiliationKey === MovieRepository.SPECIAL_ID ? affiliatedItem.slug : affiliatedItem.id}`,
        }));

      if (affiliationKey === MovieRepository.INTERNAL_ASSET) {
        item[affiliationKey].forEach((affiliatedItem: any) => {
          docs.push({
            PK: `ASSET#${affiliationType}#${affiliatedItem.id}`,
            SK: `ASSET#${affiliationType}#${affiliatedItem.id}`,
          });
        });
      }
      return docs;
    }
    return Array.from(item[affiliationKey] ?? [] as Array<Asset>).map((affiliatedItem: any) => ({
      id: affiliationKey === MovieRepository.SPECIAL_ID ? affiliatedItem.siteId : affiliatedItem.id,
      PK: `ASSET#${MovieFactory.ROOT_ENTITY}#${item.id}`,
      SK: `ASSET#${affiliationType}#${affiliationKey === MovieRepository.SPECIAL_ID ? affiliatedItem.slug : affiliatedItem.id}`,
      'GSI1-PK': `ASSET#${affiliationType}#${affiliationKey === MovieRepository.SPECIAL_ID ? affiliatedItem.slug : affiliatedItem.id}`,
      'GSI1-SK': `ASSET#${MovieFactory.ROOT_ENTITY}#${item.id}`,
      entityType: MovieFactory.ROOT_ENTITY,
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
        PK: `ASSET#${MovieFactory.ROOT_ENTITY}#${itemId}`,
        SK: `ASSET#${affiliationType}#${affiliationId}`,
      };
    }
    return {
      id: affiliationId,
      PK: `ASSET#${MovieFactory.ROOT_ENTITY}#${itemId}`,
      SK: `ASSET#${affiliationType}#${affiliationId}`,
      'GSI1-PK': `ASSET#${affiliationType}#${affiliationId}`,
      'GSI1-SK': `ASSET#${MovieFactory.ROOT_ENTITY}#${itemId}`,
      entityType: MovieFactory.ROOT_ENTITY,
    };
  }

  async save(item: Movie): Promise<boolean> {
    try {
      const movieItem = this.movieFactory.toPersistence(item);
      const movieDocument = {
        PK: `ASSET#${MovieFactory.ROOT_ENTITY}#${item.id}`,
        SK: `ASSET#${MovieFactory.ROOT_ENTITY}#${item.id}`,
        [`${MovieRepository.tableRelations[SortType.NAME].index}-PK`]: MovieRepository.tableRelations[SortType.NAME].PK,
        [`${MovieRepository.tableRelations[SortType.NAME].index}-SK`]: item.name.toLowerCase(),
        [`${MovieRepository.tableRelations[SortType.ID].index}-PK`]: MovieRepository.tableRelations[SortType.ID].PK,
        [`${MovieRepository.tableRelations[SortType.ID].index}-SK`]: item.slug.toLowerCase(),
        [`${MovieRepository.tableRelations[SortType.UPDATED].index}-PK`]: MovieRepository.tableRelations[SortType.UPDATED].PK,
        [`${MovieRepository.tableRelations[SortType.UPDATED].index}-SK`]: item.updatedAt,
        [`${MovieRepository.tableRelations[SortType.CREATED].index}-PK`]: MovieRepository.tableRelations[SortType.CREATED].PK,
        [`${MovieRepository.tableRelations[SortType.CREATED].index}-SK`]: item.createdAt,
        entityType: MovieFactory.ROOT_ENTITY,
        searchName: item.name.toLowerCase(),
        searchSlug: item.slug.toLowerCase(),
        ...movieItem,
      };
      const provider = movieItem.provider !== '' ? [this.getAffiliationDocument(item.id, movieItem.provider, 'PROVIDER')] : [];

      await this.batchWriteItem([
        movieDocument,
        ...provider,
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
      console.log('[Movie Repository]: ', e);
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async batchSave(items: Movie[]) {
    try {
      const formedMovies = items.map((item) => {
        const movieItem = this.movieFactory.toPersistence(item);
        const movieDocument = {
          PK: `ASSET#${MovieFactory.ROOT_ENTITY}#${item.id}`,
          SK: `ASSET#${MovieFactory.ROOT_ENTITY}#${item.id}`,
          [`${MovieRepository.tableRelations[SortType.NAME].index}-PK`]: MovieRepository.tableRelations[SortType.NAME].PK,
          [`${MovieRepository.tableRelations[SortType.NAME].index}-SK`]: item.name.toLowerCase(),
          [`${MovieRepository.tableRelations[SortType.ID].index}-PK`]: MovieRepository.tableRelations[SortType.ID].PK,
          [`${MovieRepository.tableRelations[SortType.ID].index}-SK`]: item.slug.toLowerCase(),
          [`${MovieRepository.tableRelations[SortType.UPDATED].index}-PK`]: MovieRepository.tableRelations[SortType.UPDATED].PK,
          [`${MovieRepository.tableRelations[SortType.UPDATED].index}-SK`]: item.updatedAt,
          [`${MovieRepository.tableRelations[SortType.CREATED].index}-PK`]: MovieRepository.tableRelations[SortType.CREATED].PK,
          [`${MovieRepository.tableRelations[SortType.CREATED].index}-SK`]: item.createdAt,
          entityType: MovieFactory.ROOT_ENTITY,
          searchName: item.name.toLowerCase(),
          searchSlug: item.slug.toLowerCase(),
          ...movieItem,
        };
        const provider = movieItem.provider !== '' ? [this.getAffiliationDocument(item.id, movieItem.provider, 'PROVIDER')] : [];

        return [
          movieDocument,
          ...provider,
          ...this.getAffiliationDocuments(item, 'platforms', 'PLATFORM'),
          ...this.getAffiliationDocuments(item, 'categories', 'CATEGORY'),
          ...this.getAffiliationDocuments(item, 'packages', 'PACKAGE'),
          ...this.getAffiliationDocuments(item, 'genres', 'GENRE'),
          ...this.getAffiliationDocuments(item, 'locations', 'LOCATION'),
          ...this.getAffiliationDocuments(item, 'streams', 'STREAM'),
          ...this.getAffiliationDocuments(item, 'distributors', 'DISTRIBUTOR'),
          ...this.getAffiliationDocuments(item, 'brands', 'BRAND'),
        ];
      });
      const flattened = formedMovies.flat(2);
      await this.batchWriteItem(flattened);
    } catch (e) {
      console.log('[Movie Repository]: ', e);
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(item: Movie): Promise<boolean> {
    try {
      const movieItem = this.movieFactory.toPersistence(item);
      const rootDocument = {
        PK: `ASSET#${MovieFactory.ROOT_ENTITY}#${movieItem.id}`,
        SK: `ASSET#${MovieFactory.ROOT_ENTITY}#${movieItem.id}`,
      };
      const provider = movieItem.provider !== '' ? [this.getAffiliationDocument(item.id, movieItem.provider, 'PROVIDER', true)] : [];
      return !!await this.batchDeleteDocuments([
        rootDocument,
        ...provider,
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
      console.log('[Movie Repository]: ', e);
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(item: Movie): Promise<boolean> {
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
          ':PK': `ASSET#${MovieFactory.ROOT_ENTITY}`,
          ':slug': item.slug.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      console.log('[Movie Repository]: ', e);
      throw new Error(e);
    }
  }
}
