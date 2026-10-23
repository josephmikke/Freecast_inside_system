import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { IEPGTemplateRepository } from './IEPGTemplateRepository';
import EPGTemplate from './EPGTemplate';

import { EPGTemplateDto, EPGTemplateRequestDto } from '../../shared/dto/EPGTemplateDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { IFactory } from '../../shared/interfaces/IFactory';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';

const rootEntityType = 'EPG_TEMPLATE';

export interface EPGTemplateDocument extends EPGTemplateRequestDto, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  searchName: string;
  searchExtId: string;
}

export default class EPGTemplateRepository extends BaseRepository implements
    IEPGTemplateRepository {
  private epgTemplateFactory: IFactory<EPGTemplate, EPGTemplateRequestDto, EPGTemplateDto>;

  constructor(
    client: DynamoDBClient,
    tableName: string,
    epgTemplateFactory: IFactory<EPGTemplate, EPGTemplateRequestDto, EPGTemplateDto>,
  ) {
    super(client, tableName);
    this.epgTemplateFactory = epgTemplateFactory;
  }

  async hasRelationships(epgTemplate: EPGTemplate): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${rootEntityType}#${epgTemplate.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(epgTemplate: EPGTemplate): Promise<boolean> {
    try {
      return !!await this.deleteDocument({
        PK: `ASSET#${rootEntityType}#${epgTemplate.id}`,
        SK: `ASSET#${rootEntityType}#${epgTemplate.id}`,
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(epgTemplate: EPGTemplate): Promise<boolean> {
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
          ':PK': `ASSET#${rootEntityType}`,
          ':extId': epgTemplate.extId.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
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
          ':PK': `ASSET#${rootEntityType}`,
        },
      });
      return await Promise.all((Items as EPGTemplateDocument[])
        .map((item) => this.epgTemplateFactory.toDomain(item)));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(epgTemplate: EPGTemplate): Promise<boolean> {
    try {
      const epgTemplateDocument: EPGTemplateDocument = {
        PK: `ASSET#${rootEntityType}#${epgTemplate.id}`,
        SK: `ASSET#${rootEntityType}#${epgTemplate.id}`,
        'GSI1-PK': `ASSET#${rootEntityType}`,
        'GSI1-SK': epgTemplate.name,
        entityType: rootEntityType,
        searchName: epgTemplate.name.toLowerCase(),
        searchExtId: epgTemplate.extId.toLowerCase(),
        ...epgTemplate,
      };
      await this.putItem(epgTemplateDocument);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findOne(id: string): Promise<EPGTemplate | undefined> {
    try {
      const { Item } = await this.getItem({
        PK: `ASSET#${rootEntityType}#${id}`,
        SK: `ASSET#${rootEntityType}#${id}`,
      });
      if (!Item) return undefined;
      return await this.epgTemplateFactory.toDomain(Item as EPGTemplateDocument);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
