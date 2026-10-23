import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import Provider from './Provider';
import { IProviderRepository } from './IProviderRepository';

import { ProviderDto, ProviderRequestDto } from '../../shared/dto/ProviderDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { IMapper } from '../../shared/interfaces/IMapper';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';

interface ProviderDocument extends ProviderRequestDto, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  searchName: string;
  searchExtId: string;
}

export default class ProviderRepository extends BaseRepository implements IProviderRepository {
  private providerMap: IMapper<Provider, ProviderRequestDto, ProviderDto>;

  constructor(
    client: DynamoDBClient,
    tableName: string,
    providerMap: IMapper<Provider, ProviderRequestDto, ProviderDto>,
  ) {
    super(client, tableName);
    this.providerMap = providerMap;
  }

  async hasRelationships(provider: Provider): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#PROVIDER#${provider.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(provider: Provider): Promise<boolean> {
    try {
      return !!await this.deleteDocument({
        PK: `ASSET#PROVIDER#${provider.id}`,
        SK: `ASSET#PROVIDER#${provider.id}`,
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(provider: Provider): Promise<boolean> {
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
          ':PK': 'ASSET#PROVIDER',
          ':extId': provider.extId.toLowerCase(),
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
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': 'ASSET#PROVIDER',
        },
      });
      return (Items as ProviderDocument[])?.map(
        (provider) => this.providerMap.toDto(provider),
      );
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(provider: Provider): Promise<boolean> {
    try {
      const providerDocument: ProviderDocument = {
        id: provider.id,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        enabled: provider.enabled,
        PK: `ASSET#PROVIDER#${provider.id}`,
        SK: `ASSET#PROVIDER#${provider.id}`,
        'GSI1-PK': 'ASSET#PROVIDER',
        'GSI1-SK': provider.name,
        entityType: 'PROVIDER',
        searchName: provider.name.toLowerCase(),
        searchExtId: provider.extId.toLowerCase(),
        extId: provider.extId,
        name: provider.name,
        configuration: provider.configuration,
        format: provider.format,
        subscription: provider.subscription,
        type: provider.type,
        mtSlug: provider.mtSlug,
        hlsMtSlug: provider.hlsMtSlug,
        aidSlug: provider.aidSlug
      };
      await this.putItem(providerDocument);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findOne(id: string): Promise<Provider | undefined> {
    try {
      const { Item } = await this.getItem({
        PK: `ASSET#PROVIDER#${id}`,
        SK: `ASSET#PROVIDER#${id}`,
      });
      if (!Item) return undefined;
      return this.providerMap.toDto(Item as ProviderDocument);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
