import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { IIngestionRepository, IngestionPage } from './IIngestionRepository';
import Ingestion from './Ingestion';

import { BaseDocument } from '../../../shared/interfaces/BaseDocument';
import {
  IngestionDto, IngestionParameters, IngestionRequestDto, MrssIngestionStatus,
} from '../../../shared/dto/vod/IngestDto';
import { SortOrder, SortType } from '../../../shared/dto/ChannelDto';

import { AttributeValue, DynamoDBClient, QueryCommandInput } from '@aws-sdk/client-dynamodb';

import { IFactory } from '../../../shared/interfaces/IFactory';

export interface IngestionDocument extends Required<IngestionDto>, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  searchIngestionId: string;
  searchExtId: string;
}

export default class IngestionRepository extends BaseRepository implements IIngestionRepository {
  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly ingestionFactory: IFactory<Ingestion,
    IngestionRequestDto, Required<IngestionDto>>,
  ) {
    super(client, tableName);
  }

  getFactory(): IFactory<Ingestion, IngestionRequestDto, IngestionDto> {
    return this.ingestionFactory;
  }

  static readonly RootEntityType = 'INGESTION';

  private static ObjectToBase64(payload: object) {
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  private static Base64ToObject(payload: string) {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf-8'));
  }

  async updateStatus(ingestion: Ingestion, statusKey: string, statusValue: MrssIngestionStatus)
    : Promise<boolean> {
    try {
      return !!await this.updateItem({
        Key: {
          PK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
          SK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
        },
        UpdateExpression: 'set #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': statusKey,
        },
        ExpressionAttributeValues: {
          ':status': statusValue,
          ':updatedAt': new Date().toISOString(),
        },
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async updateUniqueField<T>(ingestion: Ingestion, fieldKey: string, fieldValue: T)
    : Promise<boolean> {
    try {
      return !!await this.updateItem({
        Key: {
          PK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
          SK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
        },
        UpdateExpression: 'set #updatedField = :updatedField, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#updatedField': fieldKey,
        },
        ExpressionAttributeValues: {
          ':updatedField': fieldValue,
          ':updatedAt': new Date().toISOString(),
        },
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async updateJobField(
    ingestion: Ingestion,
    jobKey: string,
    jobStatus: string,
  ): Promise<boolean> {
    try {
      return !!await this.updateItem({
        Key: {
          PK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
          SK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
        },
        UpdateExpression: 'set jobs.#jobKey = :jobStatus, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#jobKey': jobKey,
        },
        ExpressionAttributeValues: {
          ':jobStatus': jobStatus,
          ':updatedAt': new Date().toISOString(),
        },
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findByExtId(extId: string): Promise<Ingestion | undefined> {
    try {
      const queryCommandInput: Omit<QueryCommandInput, 'TableName'> = {
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        FilterExpression: 'searchExtId = :extId',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': IngestionRepository.RootEntityType as unknown as AttributeValue,
          ':extId': extId.toLowerCase() as unknown as AttributeValue,
        },
      };

      const { Items } = await this.query(queryCommandInput);
      const ingestions = await Promise.all((Items as IngestionDocument[])?.map(
        async (item: IngestionDocument) => this.ingestionFactory.toDomain(item),
      ));
      return ingestions.length ? ingestions[0] : undefined;
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  async findOne(id: string): Promise<Ingestion | undefined> {
    try {
      const { Item } = await this.getItem({
        PK: `${IngestionRepository.RootEntityType}#${id}`,
        SK: `${IngestionRepository.RootEntityType}#${id}`,
      });
      if (!Item) return undefined;
      return await this.ingestionFactory
        .toDomain(Item as IngestionDocument);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(ingestion: Ingestion): Promise<boolean> {
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
          ':PK': `${IngestionRepository.RootEntityType}`,
          ':extId': ingestion.extId.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findAll(ingestionsParams?: IngestionParameters): Promise<IngestionPage> {
    try {
      // basic index and pagination
      const queryCommandInput: Omit<QueryCommandInput, 'TableName'> = {
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': IngestionRepository.RootEntityType as unknown as AttributeValue,
        },
        Limit: ingestionsParams?.limit ?? 10,
        ExclusiveStartKey: ingestionsParams?.nextToken
          ? IngestionRepository.Base64ToObject(ingestionsParams.nextToken) : undefined,
      };

      // search by id/extId
      if (ingestionsParams?.search !== undefined && ingestionsParams.search !== '') {
        queryCommandInput.ExpressionAttributeNames = {
          ...queryCommandInput.ExpressionAttributeNames,
          '#searchIngestionId': 'searchIngestionId',
          '#searchExtId': 'searchExtId',
        };
        queryCommandInput.ExpressionAttributeValues = {
          ...queryCommandInput.ExpressionAttributeValues,
          ':search': ingestionsParams.search.toLowerCase() as unknown as AttributeValue,
        };
        // contains on either id or extId
        queryCommandInput.FilterExpression = 'contains(#searchIngestionId, :search) or contains(#searchExtId, :search)';
      }

      // filter by status/parent/enabled
      if (ingestionsParams?.filter) {
        const filterExpr: string[] = [];
        if (ingestionsParams.filter.status !== undefined) {
          queryCommandInput.ExpressionAttributeNames = {
            ...queryCommandInput.ExpressionAttributeNames,
            '#status': 'status',
          };
          queryCommandInput.ExpressionAttributeValues = {
            ...queryCommandInput.ExpressionAttributeValues,
            ':status': ingestionsParams.filter.status as unknown as AttributeValue,
          };
          filterExpr.push('#status = :status');
        }
        if (ingestionsParams.filter.parentId !== undefined) {
          queryCommandInput.ExpressionAttributeNames = {
            ...queryCommandInput.ExpressionAttributeNames,
            '#parentId': 'parentId',
          };
          queryCommandInput.ExpressionAttributeValues = {
            ...queryCommandInput.ExpressionAttributeValues,
            ':parentId': ingestionsParams.filter.parentId as unknown as AttributeValue,
          };
          filterExpr.push('#parentId = :parentId');
        }
        if (ingestionsParams.filter.enabled !== undefined) {
          queryCommandInput.ExpressionAttributeNames = {
            ...queryCommandInput.ExpressionAttributeNames,
            '#enabled': 'enabled',
          };
          queryCommandInput.ExpressionAttributeValues = {
            ...queryCommandInput.ExpressionAttributeValues,
            ':enabled': ingestionsParams.filter.enabled as unknown as AttributeValue,
          };
          filterExpr.push('#enabled = :enabled');
        }

        if (filterExpr.length) {
          const expr = filterExpr.join(' and ');
          if (queryCommandInput.FilterExpression) {
            queryCommandInput.FilterExpression = `${queryCommandInput.FilterExpression} and ${expr}`;
          } else {
            queryCommandInput.FilterExpression = expr;
          }
        }
      }

      // sort by created/updated/id/name fallbacks if present on base entity via GSIs
      if (ingestionsParams?.sort?.attr) {
        const order = ingestionsParams.sort.order ?? SortOrder.DESC;
        switch (ingestionsParams.sort.attr) {
          case SortType.UPDATED:
            queryCommandInput.IndexName = 'GSI3';
            queryCommandInput.ExpressionAttributeNames = {
              ...queryCommandInput.ExpressionAttributeNames,
              '#PK': 'GSI3-PK',
            };
            queryCommandInput.ExpressionAttributeValues = {
              ...queryCommandInput.ExpressionAttributeValues,
              ':PK': `ASSET#INGESTION#UPDATED` as unknown as AttributeValue,
            };
            queryCommandInput.ScanIndexForward = order === SortOrder.ASC;
            break;
          case SortType.CREATED:
            queryCommandInput.IndexName = 'GSI4';
            queryCommandInput.ExpressionAttributeNames = {
              ...queryCommandInput.ExpressionAttributeNames,
              '#PK': 'GSI4-PK',
            };
            queryCommandInput.ExpressionAttributeValues = {
              ...queryCommandInput.ExpressionAttributeValues,
              ':PK': `ASSET#INGESTION#CREATED` as unknown as AttributeValue,
            };
            queryCommandInput.ScanIndexForward = order === SortOrder.ASC;
            break;
          case SortType.ID:
          case SortType.NAME:
          default:
            // fall back to GSI1, range by GSI1-SK if present; otherwise leave default
            queryCommandInput.ScanIndexForward = order === SortOrder.ASC;
            break;
        }
      }

      const { Items, LastEvaluatedKey } = await this.query(queryCommandInput);
      const ingestions = await Promise.all((Items as IngestionDocument[])?.map(
        async (item: IngestionDocument) => this.ingestionFactory.toDomain(item),
      ));
      return {
        ingestions,
        nextToken: LastEvaluatedKey
          ? IngestionRepository.ObjectToBase64(LastEvaluatedKey) : undefined,
      };
    } catch (e) {
      this.Logger.error(e);
      throw e;
    }
  }

  // Should be used internally to manage ingestion
  async findAllByStatus(status: MrssIngestionStatus): Promise<Ingestion[]> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#status': 'status',
        },
        FilterExpression: '#status = :status',
        ExpressionAttributeValues: {
          ':PK': `${IngestionRepository.RootEntityType}`,
          ':status': status,
        },
      });
      return await Promise.all((Items as IngestionDocument[])?.map(
        async (ingestion) => this.ingestionFactory
          .toDomain(ingestion),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(ingestion: Ingestion): Promise<boolean> {
    try {
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `${IngestionRepository.RootEntityType}#${ingestion.id}`,
          ':SK': `${IngestionRepository.RootEntityType}#`,
        },
      });
      const ingestionDocuments = Items?.map((ingestionDocument) => ({
        PK: ingestionDocument.PK,
        SK: ingestionDocument.SK,
      }));
      if (!ingestionDocuments?.length) return false;
      return !!await this.batchDeleteDocuments(ingestionDocuments);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(ingestion: Ingestion): Promise<boolean> {
    try {
      const rawIngestion = this.ingestionFactory.toPersistence(ingestion);
      const ingestionDocument: Omit<IngestionDocument, 'username'> = {
        PK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
        SK: `${IngestionRepository.RootEntityType}#${ingestion.id}`,
        'GSI1-PK': IngestionRepository.RootEntityType,
        'GSI1-SK': `${IngestionRepository.RootEntityType}#${ingestion.id}`,
        entityType: IngestionRepository.RootEntityType,
        searchIngestionId: ingestion.id,
        searchExtId: ingestion.extId.toLowerCase(),
        createdAt: rawIngestion.createdAt,
        enabled: rawIngestion.enabled,
        extId: rawIngestion.extId,
        id: rawIngestion.id,
        parentId: rawIngestion.parentId,
        status: rawIngestion.status,
        jobs: rawIngestion.jobs,
        updatedAt: rawIngestion.updatedAt,
        failures: rawIngestion.failures,
        saved: rawIngestion.saved,
      };

      return !!await this.batchWriteItem([ingestionDocument]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
