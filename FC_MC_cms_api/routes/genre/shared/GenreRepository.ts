import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import Genre from './Genre';
import { IGenreRepository } from './IGenreRepository';

import { GenreDto, GenreRequestDto } from '../../shared/dto/GenreDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { IMapper } from '../../shared/interfaces/IMapper';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';

interface GenreDocument extends Required<GenreDto>, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  'GSI5-PK': string;
  'GSI5-SK': number;
  searchName: string;
  searchExtId: string;
}

export default class GenreRepository extends BaseRepository implements IGenreRepository {
  private genreMap: IMapper<Genre, GenreRequestDto, GenreDto>;

  private static ROOT_ENTITY = 'GENRE';

  constructor(
    client: DynamoDBClient,
    tableName: string,
    genreMap: IMapper<Genre, GenreRequestDto, GenreDto>,
  ) {
    super(client, tableName);
    this.genreMap = genreMap;
  }

  async updateWeight(genres: Genre[]): Promise<boolean> {
    try {
      const updatedGenres = genres.map((genre) => ({
        id: genre.id,
        createdAt: genre.createdAt,
        updatedAt: genre.updatedAt,
        enabled: genre.enabled,
        PK: `ASSET#${GenreRepository.ROOT_ENTITY}#${genre.id}`,
        SK: `ASSET#${GenreRepository.ROOT_ENTITY}#${genre.id}`,
        'GSI1-PK': `ASSET#${GenreRepository.ROOT_ENTITY}`,
        'GSI1-SK': genre.name,
        'GSI5-PK': `ASSET#${GenreRepository.ROOT_ENTITY}`,
        'GSI5-SK': genre.weight,
        weight: genre.weight,
        entityType: GenreRepository.ROOT_ENTITY,
        searchName: genre.name.toLowerCase(),
        searchExtId: genre.extId.toLowerCase(),
        extId: genre.extId,
        name: genre.name,
      }));

      return !!await this.batchWriteItem(updatedGenres);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async hasRelationships(genre: Genre): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GenreRepository.ROOT_ENTITY}#${genre.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(genre: Genre): Promise<boolean> {
    try {
      return !!await this.deleteDocument({
        PK: `ASSET#${GenreRepository.ROOT_ENTITY}#${genre.id}`,
        SK: `ASSET#${GenreRepository.ROOT_ENTITY}#${genre.id}`,
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(genre: Genre): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        FilterExpression: '#extId = :extId',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#extId': 'searchExtId',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GenreRepository.ROOT_ENTITY}`,
          ':extId': genre.extId.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findAll() {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI5',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI5-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${GenreRepository.ROOT_ENTITY}`,
        },
      });
      return (Items as GenreDocument[])?.map(
        (genre) => this.genreMap.toDto(genre),
      );
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findMany(ids: string[]): Promise<Genre[]> {
    try {
      const items = await this.batchGetItem(ids.map((id) => ({
        PK: `ASSET#${GenreRepository.ROOT_ENTITY}#${id}`,
        SK: `ASSET#${GenreRepository.ROOT_ENTITY}#${id}`,
      })));
      return await Promise.all((items as GenreDocument[])?.map(
        async (genre) => this.genreMap.toDomain(genre),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(genre: Genre): Promise<boolean> {
    try {
      const genreDocument: GenreDocument = {
        id: genre.id,
        createdAt: genre.createdAt,
        updatedAt: genre.updatedAt,
        enabled: genre.enabled,
        PK: `ASSET#${GenreRepository.ROOT_ENTITY}#${genre.id}`,
        SK: `ASSET#${GenreRepository.ROOT_ENTITY}#${genre.id}`,
        'GSI1-PK': `ASSET#${GenreRepository.ROOT_ENTITY}`,
        'GSI1-SK': genre.name,
        'GSI5-PK': `ASSET#${GenreRepository.ROOT_ENTITY}`,
        'GSI5-SK': genre.weight,
        weight: genre.weight,
        entityType: GenreRepository.ROOT_ENTITY,
        searchName: genre.name.toLowerCase(),
        searchExtId: genre.extId.toLowerCase(),
        extId: genre.extId,
        name: genre.name,
      };
      await this.putItem(genreDocument);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findOne(id: string): Promise<Genre | undefined> {
    try {
      const { Item } = await this.getItem({
        PK: `ASSET#${GenreRepository.ROOT_ENTITY}#${id}`,
        SK: `ASSET#${GenreRepository.ROOT_ENTITY}#${id}`,
      });
      if (!Item) return undefined;
      return this.genreMap.toDto(Item as GenreDocument);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findBy(attribute: string, search: string): Promise<Array<Genre>> {
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
          ':PK': `ASSET#${GenreRepository.ROOT_ENTITY}`,
          ':searchAttr': search,
        },
      });
      return await Promise.all(await Items?.map(
        async (genre) => this.genreMap.toDomain(genre as GenreDocument),
      ) ?? []);
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }
}
