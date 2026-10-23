import { AttributeValue, DynamoDBClient, QueryCommandInput, QueryCommandOutput } from '@aws-sdk/client-dynamodb';

import { EPGDto, EPGProgramsParameters, EPGRequestDto } from '../../shared/dto/EPGDto';
import { BaseDocument } from '../../shared/interfaces/BaseDocument';
import { IFactory } from '../../shared/interfaces/IFactory';

import EPG from './EPG';
import { IEPGProgramBuilder } from './IEPGProgramBuilder';
import { IEPGRepository } from './IEPGRepository';

import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { EPGProgram } from './IParser';

export interface EPGDocument extends EPGRequestDto, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  searchName: string;
  searchExtId: string;
}

export interface EPGProgramDocument extends EPGProgram, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  searchName: string;
  searchExtId: string;
}

export default class EPGRepository extends BaseRepository implements IEPGRepository {
  static readonly RootEntityType = 'EPG';

  static readonly ChildEntityType = 'EPG_PROGRAM';

  static readonly EpgTemplateEntityType = 'EPG_TEMPLATE';

  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly epgFactory: IFactory<EPG, EPGRequestDto, EPGDto>,
    private readonly epgProgramBuilder: IEPGProgramBuilder<EPGProgram>,
  ) {
    super(client, tableName);
  }

  private static getRootEntity(items: Record<string, any>[]) {
    const [epg] = items.filter((item) => item.entityType === EPGRepository.RootEntityType);
    return epg as EPGDocument;
  }

  private getEPGPrograms(items?: Record<string, any>[]) {
    const programs = items?.filter((item) => item.entityType === EPGRepository.ChildEntityType)
      .map((item) => this.epgProgramBuilder
        .create({
          generate: () => item.id,
        })
        .addEndTime(item.end_time)
        .addExtId(item.ext_id)
        .addDuration(item.duration)
        .addThumbnail(item.thumbnail)
        .addAlternateThumbnail(item.alternateThumbnail ?? null)
        .setCatchup(item.catchup)
        .setArchive(item.archive ?? false)
        .setRating(item.rating ?? null)
        .addTitle(item.title)
        .addDescription(item.description)
        .addStartTime(item.start_time)
        .addSlug(item.slug)
        .addSubtitle(item.subtitle)
        .addEndTime(item.end_time)
        .getResult());
    return programs as EPGProgram[];
  }

  async ingestEPG(template: EPG): Promise<boolean> {
    try {
      const rawTemplate = this.epgFactory.toPersistence(template);

      await this.updateItem({
        Key: {
          PK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
          SK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
        },
        UpdateExpression: 'set updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':updatedAt': new Date().toISOString(),
        },
      });

      const programDocuments = Array.from(rawTemplate.programs).map((program) => ({
        PK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
        SK: `ASSET#${EPGRepository.ChildEntityType}#${program.start_time}`,
      }));
      await this.batchDeleteDocuments([
        ...programDocuments]);

      const epgProgramsDocument: EPGProgramDocument[] = template.programs
        .map((program) => <EPGProgramDocument>({
          PK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
          SK: `ASSET#${EPGRepository.ChildEntityType}#${program.start_time}`,
          entityType: EPGRepository.ChildEntityType,
          searchName: program.title.toLowerCase(),
          ...program,
        }));
      await this.batchWriteItem([...epgProgramsDocument]);

      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(template: EPG): Promise<boolean> {
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
          ':PK': `ASSET#${EPGRepository.RootEntityType}`,
          ':extId': template.extId.toLowerCase(),
        },
      });
      return !!Items?.length;
    } catch (e) {
      throw new Error(e);
    }
  }

  async findAll(programParams?: EPGProgramsParameters): Promise<EPG[]> {
    try {
      const defaultStartTime = new Date(programParams?.filter.startTime ?? Date.now());
      const defaultEndTime = new Date(programParams?.filter.endTime ?? Date.now());

      if (programParams?.filter.startTime === undefined) {
        defaultStartTime.setHours(defaultStartTime.getHours() - 12);
      }
      if (programParams?.filter.endTime === undefined) {
        defaultEndTime.setHours(defaultEndTime.getHours() + 12);
      }
      const { Items: epgs } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${EPGRepository.RootEntityType}`,
        },
      });
      return await Promise.all((epgs as EPGDocument[])?.map(
        async (epg: EPGDocument) => {
          const programsQuery: Omit<QueryCommandInput, 'TableName'> = {
            KeyConditionExpression: 'PK = :PK AND begins_with(SK, :SK)',
            ExpressionAttributeValues: {
              ':PK': `ASSET#${EPGRepository.RootEntityType}#${epg.id}` as unknown as AttributeValue,
              ':SK': `ASSET#${EPGRepository.ChildEntityType}` as unknown as AttributeValue,
            },
          };
          if (!programParams?.ignore) {
            programsQuery.ExpressionAttributeNames = {
              '#start': 'start_time',
              '#end': 'end_time',
            };
            programsQuery.ExpressionAttributeValues = {
              ...programsQuery.ExpressionAttributeValues,
              ':start': defaultStartTime.toISOString() as unknown as AttributeValue,
              ':end': defaultEndTime.toISOString() as unknown as AttributeValue,
            };
            programsQuery.FilterExpression = '#start >= :start and #end <= :end';
          }
          const { Items } = await this.query(programsQuery);
          const programs = this.getEPGPrograms(Items);
          return this.epgFactory.toDomain({ ...epg, programs });
        },
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findOne(id: string, programParams?: EPGProgramsParameters): Promise<EPG | undefined> {
    try {
      const defaultStartTime = new Date(programParams?.filter.startTime ?? Date.now());
      const defaultEndTime = new Date(programParams?.filter.endTime ?? Date.now());

      if (programParams?.filter.startTime === undefined) {
        defaultStartTime.setHours(defaultStartTime.getHours() - 12);
      }
      if (programParams?.filter.endTime === undefined) {
        defaultEndTime.setHours(defaultEndTime.getHours() + 12);
      }

      if (defaultStartTime > defaultEndTime) {
        defaultEndTime.setHours(defaultStartTime.getHours() + 12);
      }
      
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${EPGRepository.RootEntityType}#${id}`,
          ':SK': `ASSET#${EPGRepository.RootEntityType}#${id}`,
        },
      });
      if (!Items?.length) return undefined;
      const epg = EPGRepository.getRootEntity(Items);
      const programsQuery: Omit<QueryCommandInput, 'TableName'> = {
        KeyConditionExpression: 'PK = :PK AND begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${EPGRepository.RootEntityType}#${epg.id}` as unknown as AttributeValue,
          ':SK': `ASSET#${EPGRepository.ChildEntityType}` as unknown as AttributeValue,
        },
      };
      if (!programParams?.ignore) {
        programsQuery.ExpressionAttributeNames = {
          '#start': 'start_time',
          '#end': 'end_time',
        };
        programsQuery.ExpressionAttributeValues = {
          ...programsQuery.ExpressionAttributeValues,
          ':start': defaultStartTime.toISOString() as unknown as AttributeValue,
          ':end': defaultEndTime.toISOString() as unknown as AttributeValue,
        };
        programsQuery.FilterExpression = '#start >= :start and #end <= :end';
      }
      let allItems: any[] = [];
      let lastEvaluatedKey: Record<string, any> | undefined;
      let response: QueryCommandOutput;
      do {
        response  = await this.query(programsQuery);

        if (response.Items && response.Items.length > 0) {
          allItems = allItems.concat(response.Items);
        }

        lastEvaluatedKey = response.LastEvaluatedKey;
      } while (response.LastEvaluatedKey);

      const programs = this.getEPGPrograms(allItems);
      return await this.epgFactory.toDomain({ ...epg, programs });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async hasRelationships(template: EPG): Promise<boolean> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
        },
      });
      return !!Items?.length;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(template: EPG): Promise<boolean> {
    try {
      const rawTemplate = this.epgFactory.toPersistence(template);
      const rootDocument = {
        PK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
        SK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
      };
      const programDocuments = Array.from(rawTemplate.programs).map((program) => ({
        PK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
        SK: `ASSET#${EPGRepository.ChildEntityType}#${program.start_time}`,
      }));
      const epgTemplateDocument = {
        PK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
        SK: `ASSET#${EPGRepository.EpgTemplateEntityType}#${template.epgTemplate.id}`,
      };
      return !!await this.batchDeleteDocuments([
        rootDocument,
        epgTemplateDocument,
        ...programDocuments]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(template: EPG): Promise<boolean> {
    try {
      const epgDocument: EPGDocument = {
        PK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
        SK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
        'GSI1-PK': `ASSET#${EPGRepository.RootEntityType}`,
        'GSI1-SK': template.name,
        entityType: EPGRepository.RootEntityType,
        searchName: template.name.toLowerCase(),
        searchExtId: template.extId.toLowerCase(),
        id: template.id,
        extId: template.extId,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
        enabled: template.enabled,
        ingestionSchedule: template.ingestionSchedule.value(),
        name: template.name,
        thumbnail: template.thumbnail.value(),
        timezone: template.timezone,
        epgTemplate: template.epgTemplate.id,
        ingestionUrl: template.ingestionUrl,
      };

      const epgTemplateDocument = {
        PK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
        SK: `ASSET#${EPGRepository.EpgTemplateEntityType}#${template.epgTemplate.id}`,
        'GSI1-PK': `ASSET#${EPGRepository.EpgTemplateEntityType}#${template.epgTemplate.id}`,
        'GSI1-SK': `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
        id: template.epgTemplate.id,
        entityType: EPGRepository.EpgTemplateEntityType,
      };

      const epgProgramsDocument: EPGProgramDocument[] = template.programs
        .map((program) => <EPGProgramDocument>({
          PK: `ASSET#${EPGRepository.RootEntityType}#${template.id}`,
          SK: `ASSET#${EPGRepository.ChildEntityType}#${program.start_time}`,
          entityType: EPGRepository.ChildEntityType,
          searchName: program.title.toLowerCase(),
          ...program,
        }));
      await this.batchWriteItem([epgDocument, epgTemplateDocument, ...epgProgramsDocument]);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async removeProgram(epgId: string, program: EPGProgram): Promise<boolean> {
    try {
      const programDocument = {
        PK: `ASSET#${EPGRepository.RootEntityType}#${epgId}`,
        SK: `ASSET#${EPGRepository.ChildEntityType}#${program.start_time}`,
      };

      return !!await this.batchDeleteDocuments([programDocument]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async removeAllPrograms(epg: EPG): Promise<boolean> {
    try {
      const programsDocument = epg.programs.map((program) => ({
        PK: `ASSET#${EPGRepository.RootEntityType}#${epg.id}`,
        SK: `ASSET#${EPGRepository.ChildEntityType}#${program.start_time}`,
      }));
      return !!await this.batchDeleteDocuments(programsDocument);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async saveProgram(epgId: string, program: EPGProgram): Promise<boolean> {
    try {
      const epgProgramDocument: EPGProgramDocument = <EPGProgramDocument>({
        PK: `ASSET#${EPGRepository.RootEntityType}#${epgId}`,
        SK: `ASSET#${EPGRepository.ChildEntityType}#${program.start_time}`,
        entityType: EPGRepository.ChildEntityType,
        searchName: program.title.toLowerCase(),
        ...program,
      });
      await this.batchWriteItem([epgProgramDocument]);
      return true;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
