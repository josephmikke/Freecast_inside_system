import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import Package from './Package';

import { PackageDto, PackageRequestDto } from '../../shared/dto/PackageDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { IFactory } from '../../shared/interfaces/IFactory';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';

import { IPackageRepository } from './IPackageRepository';

interface PackageDocument extends Required<PackageDto>, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  'GSI5-PK': string;
  'GSI5-SK': number;
  searchName: string;
  searchExtId: string;
}

export default class PackageRepository extends BaseRepository implements IPackageRepository {
  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly packageFactory: IFactory<Package, PackageRequestDto, PackageDto>,
  ) {
    super(client, tableName);
    this.packageFactory = packageFactory;
  }

  async hasRelationships(item: Package): Promise<any> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#PACKAGE#${item.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(item: Package): Promise<boolean> {
    try {
      const packageItem = this.packageFactory.toPersistence(item);
      const rootDocument = {
        PK: `ASSET#PACKAGE#${packageItem.id}`,
        SK: `ASSET#PACKAGE#${packageItem.id}`,
      };
      const platformDocuments = Array.from(packageItem.platforms || []).map((platformId) => ({
        PK: `ASSET#PACKAGE#${packageItem.id}`,
        SK: `ASSET#PLATFORM#${platformId}`,
      }));
      return !!await this.batchDeleteDocuments([...platformDocuments, rootDocument]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(item: Package): Promise<boolean> {
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
          ':PK': 'ASSET#PACKAGE',
          ':extId': item.extId.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findMany(ids: Array<string>): Promise<Array<Package>> {
    try {
      const Items = await this.batchGetItem(ids.map((id) => ({
        PK: `ASSET#PACKAGE#${id}`,
        SK: `ASSET#PACKAGE#${id}`,
      })));
      return await Promise.all((Items as PackageDocument[])?.map(
        async (item: PackageDocument) => this.packageFactory.toDomain(item),
      ));
    } catch (e) {
      this.Logger.error(e);
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
          ':PK': 'ASSET#PACKAGE',
        },
      });
      return await Promise.all((Items as PackageDocument[])?.map(
        async (item: PackageDocument) => this.packageFactory.toDomain(item),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(item: Package): Promise<boolean> {
    try {
      const packageItem = this.packageFactory.toPersistence(item);
      const packageDocument = {
        PK: `ASSET#PACKAGE#${item.id}`,
        SK: `ASSET#PACKAGE#${item.id}`,
        'GSI1-PK': 'ASSET#PACKAGE',
        'GSI1-SK': item.name,
        entityType: 'PACKAGE',
        searchName: item.name.toLowerCase(),
        searchExtId: item.extId.toLowerCase(),
        'GSI5-PK': 'ASSET#PACKAGE',
        'GSI5-SK': packageItem.weight,
        ...packageItem,
      };
      const platforms = Array.from(packageItem.platforms || []).map((platformId) => ({
        id: platformId,
        PK: `ASSET#PACKAGE#${item.id}`,
        SK: `ASSET#PLATFORM#${platformId}`,
        'GSI1-PK': `ASSET#PLATFORM#${platformId}`,
        'GSI1-SK': `ASSET#PACKAGE#${item.id}`,
        entityType: 'PACKAGE',
      }));
      await this.batchWriteItem([...platforms, packageDocument]);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  private static getRootEntity(id: string, items: Record<string, any>[]) {
    const [packageItem] = items.filter((item) => item.SK === `ASSET#PACKAGE#${id}`);
    return packageItem as PackageDocument;
  }

  async findOne(id: string): Promise<Package | undefined> {
    try {
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#PACKAGE#${id}`,
          ':SK': 'ASSET#',
        },
      });
      if (!Items?.length) return undefined;
      const packageItem = PackageRepository.getRootEntity(id, Items);
      return await this.packageFactory.toDomain(packageItem as PackageDocument);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async updateWeight(packages: Array<Package>): Promise<boolean> {
    try {
      const updatedPackages = packages.map((packageItem) => ({
        ...this.packageFactory.toPersistence(packageItem),
        PK: `ASSET#PACKAGE#${packageItem.id}`,
        SK: `ASSET#PACKAGE#${packageItem.id}`,
        'GSI1-PK': 'ASSET#PACKAGE',
        'GSI1-SK': packageItem.name,
        entityType: 'PACKAGE',
        searchName: packageItem.name.toLowerCase(),
        searchExtId: packageItem.extId.toLowerCase(),
        'GSI5-PK': 'ASSET#PACKAGE',
        'GSI5-SK': packageItem.weight,
      }));

      return !!await this.batchWriteItem(updatedPackages);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
