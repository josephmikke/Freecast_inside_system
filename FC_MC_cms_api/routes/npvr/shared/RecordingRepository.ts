import { BaseRepository } from '/opt/nodejs/powertools/Repository';

import { IRecordingRepository } from './IRecordingRepository';
import Recording from './Recording';

import { BaseDocument } from '../../shared/interfaces/BaseDocument';
import {
  PersistedRecordingDto, RecordingDto, RecordingRequestDto, RecordingStatus,
} from '../../shared/dto/RecordingDto';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { IFactory } from '../../shared/interfaces/IFactory';
import { QueryCommandOutput } from '@aws-sdk/lib-dynamodb';

export interface RecordingDocument extends PersistedRecordingDto, BaseDocument {
  'GSI1-PK': string;
  'GSI1-SK': string;
  searchRecordingId: string;
}

export default class RecordingRepository extends BaseRepository implements IRecordingRepository {
  constructor(
    client: DynamoDBClient,
    tableName: string,
    private readonly recordingFactory: IFactory<Recording,
    RecordingRequestDto, PersistedRecordingDto>,
  ) {
    super(client, tableName);
  }

  static readonly RootEntityType = 'RECORDING';

  static readonly ChildEntityType = 'RECORDING_USER';

  async updateStatus(recording: Recording, statusKey: string, statusValue: RecordingStatus)
    : Promise<boolean> {
    try {
      return !!await this.updateItem({
        Key: {
          PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
          SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
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

  async updateUniqueField<T>(recording: Recording, fieldKey: string, fieldValue: T)
    : Promise<boolean> {
    try {
      return !!await this.updateItem({
        Key: {
          PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
          SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
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

  async findOne(id: string): Promise<Recording | undefined> {
    try {
      const { Item } = await this.getItem({
        PK: `${RecordingRepository.RootEntityType}#${id}`,
        SK: `${RecordingRepository.RootEntityType}#${id}`,
      });
      if (!Item) return undefined;
      return await this.recordingFactory
        .toDomain({ ...Item as RecordingDocument, username: 'SYSTEM' });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async exists(recording: Recording): Promise<boolean> {
    try {
      const { Item } = await this.getItem({
        PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
        SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      });
      return !!Item;
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
  async findAllByStatus(status: RecordingStatus): Promise<Recording[]> {
    try {
      let response: QueryCommandOutput = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':PK': 'RECORDING',
          ':status': `${status}`,
        },
      });
      let its: any[] = [];
      its = [...its, ...(response.Items as any[])];
    
      while (response.LastEvaluatedKey)  {    
        response = await this.query({
          IndexName: 'GSI1',
          KeyConditionExpression: '#PK = :PK',
          FilterExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#PK': 'GSI1-PK',
            '#status': 'status',
          },
          ExpressionAttributeValues: {
            ':PK': 'RECORDING',
            ':status': `${status}`,
          },
          ExclusiveStartKey: response.LastEvaluatedKey
        });
        its = [...its, ...(response.Items as any[])];
      }  
      return await Promise.all((its as RecordingDocument[])?.map(
        async (recording) => this.recordingFactory
          .toDomain({ ...recording, username: 'SYSTEM' }),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findAllByUserId(username: string): Promise<Recording[]> {
    try {
      const { Items } = await this.query({
        IndexName: 'GSI1',
        KeyConditionExpression: '#PK = :PK',
        ExpressionAttributeNames: {
          '#PK': 'GSI1-PK',
        },
        ExpressionAttributeValues: {
          ':PK': `${RecordingRepository.RootEntityType}#${username}`,
        },
      });
      const recordingDocuments = Items?.map((recordingDocument) => ({
        PK: recordingDocument.PK,
        SK: recordingDocument.PK, // We need the root document
      }));
      if (!recordingDocuments?.length) return [];
      const recordings = await this.batchGetItem(recordingDocuments);

      return await Promise.all((recordings as RecordingDocument[])?.map(
        async (recording) => this.recordingFactory
          .toDomain({ ...recording, username }),
      ));
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async findOneByUserId(username: string, id: string): Promise<Recording | undefined> {
    try {
      const EXPECTED_NUMBER_OF_ITEMS = 2;
      const items = await this.batchGetItem([{
        PK: `${RecordingRepository.RootEntityType}#${id}`,
        SK: `${RecordingRepository.RootEntityType}#${id}`,
      }, {
        PK: `${RecordingRepository.RootEntityType}#${id}`,
        SK: `${RecordingRepository.RootEntityType}#${username}`,
      },
      ]);
      if (items.length !== EXPECTED_NUMBER_OF_ITEMS) return undefined;
      const [recording] = items
        .filter((item) => item.entityType === RecordingRepository.RootEntityType);
      const [user] = items
        .filter((item) => item.entityType === RecordingRepository.ChildEntityType);
      return await this.recordingFactory
        .toDomain({ ...recording, username: user.username } as PersistedRecordingDto);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async removeFromUserList(recording: Recording | Recording[]): Promise<boolean> {
    try {
      if (recording instanceof Recording) {
        return !!await this.deleteDocument({
          PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
          SK: `${RecordingRepository.RootEntityType}#${recording.username}`,
        });
      }
      const recordingDocuments = recording.map((item) => ({
        PK: `${RecordingRepository.RootEntityType}#${item.id}`,
        SK: `${RecordingRepository.RootEntityType}#${item.username}`,
      }));
      return !!await this.batchDeleteDocuments(recordingDocuments);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async removeRootEntity(recording: Recording): Promise<boolean> {
    try {
      return !!await this.getItem({
        PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
        SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
      });
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async remove(recording: Recording): Promise<boolean> {
    try {
      const { Items } = await this.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `${RecordingRepository.RootEntityType}#${recording.id}`,
          ':SK': `${RecordingRepository.RootEntityType}#`,
        },
      });
      const recordingDocuments = Items?.map((recordingDocument) => ({
        PK: recordingDocument.PK,
        SK: recordingDocument.SK,
      }));
      if (!recordingDocuments?.length) return false;
      return !!await this.batchDeleteDocuments(recordingDocuments);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }

  async save(recording: Recording): Promise<boolean> {
    try {
      const rawRecording = this.recordingFactory.toPersistence(recording);
      const recordingDocument: Omit<RecordingDocument, 'username'> = {
        PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
        SK: `${RecordingRepository.RootEntityType}#${recording.id}`,
        'GSI1-PK': RecordingRepository.RootEntityType,
        'GSI1-SK': `${RecordingRepository.RootEntityType}#${recording.id}`,
        entityType: RecordingRepository.RootEntityType,
        searchRecordingId: recording.program.id,
        channel: rawRecording.channel,
        createdAt: rawRecording.createdAt,
        enabled: rawRecording.enabled,
        extId: rawRecording.extId,
        id: rawRecording.id,
        program: rawRecording.program,
        status: rawRecording.status,
        dashStatus: rawRecording.dashStatus,
        hlsStatus: rawRecording.hlsStatus,
        updatedAt: rawRecording.updatedAt,
        destination: rawRecording.destination,
        failureReason: rawRecording.failureReason,
        // searchName: recording.program.title.toLowerCase(),
      };
      if (recording.username === 'SYSTEM') return !!await this.putItem(recordingDocument);
      const userDocument = {
        PK: `${RecordingRepository.RootEntityType}#${recording.id}`,
        SK: `${RecordingRepository.RootEntityType}#${recording.username}`,
        'GSI1-PK': `${RecordingRepository.RootEntityType}#${recording.username}`,
        'GSI1-SK': `${RecordingRepository.RootEntityType}#${recording.id}`,
        entityType: RecordingRepository.ChildEntityType,
        username: recording.username,
      };
      return !!await this.batchWriteItem([recordingDocument, userDocument]);
    } catch (e) {
      this.Logger.error(e);
      throw new Error(e);
    }
  }
}
