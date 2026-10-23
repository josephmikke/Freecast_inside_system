import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { MonitorLogDTO } from '../../../shared/dto/MonitorLogDto';
import MonitorLogFactory from '../MonitorLogFactory';
import MonitorLogRepository from '../MonitorLogRepository';
import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

jest.mock('/opt/nodejs/powertools/UIDGenerator', () => {
  return jest.fn().mockImplementation(() => ({
    generate: jest.fn().mockReturnValue('793986f01cf9e365')
  }));
});

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const TABLE_NAME = 'test-monitorLogService';
const MONITOR_LOG_ID = '793986f01cf9e365';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const uid = new UIDGenerator();
const monitorLogFactory = new MonitorLogFactory(uid);
const monitorLogRepository = new MonitorLogRepository(ddbClient, TABLE_NAME, monitorLogFactory);

const sampleMonitorLog: MonitorLogDTO = {
  id: MONITOR_LOG_ID,
  channel: 'test-channel',
  timestamp: [new Date()],
  message: 'Test message',
  level: 'INFO',
  metadata: {
    flowArn: 'arn:aws:mediaconnect:test',
    extId: 'test-ext-id',
    createdAt: '2022-10-17T00:00:00.000Z',
    updatedAt: '2022-10-17T00:00:00.000Z',
    entity: 'ALARM',
    title: 'Test Alert'
  }
};

describe('MonitorLogFactory', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  describe('toDomain', () => {
    it('should create a MonitorLog with required fields', async () => {
      const monitorLogItem = await monitorLogFactory.toDomain(sampleMonitorLog);
      expect(monitorLogItem.id).toEqual(MONITOR_LOG_ID);
      expect(monitorLogItem.channel).toEqual(sampleMonitorLog.channel);
      expect(monitorLogItem.timestamp).toEqual(sampleMonitorLog.timestamp);
      expect(monitorLogItem.message).toEqual(sampleMonitorLog.message);
      expect(monitorLogItem.level).toEqual(sampleMonitorLog.level);
      expect(monitorLogItem.metadata).toEqual(sampleMonitorLog.metadata);
    });

    it('should create a MonitorLog with minimal fields', async () => {
      const minimalLog = {
        id: MONITOR_LOG_ID,
        channel: 'test-channel',
        timestamp: [new Date()],
        message: 'Test message',
        level: 'INFO'
      };

      const monitorLogItem = await monitorLogFactory.toDomain(minimalLog);
      expect(monitorLogItem.id).toEqual(MONITOR_LOG_ID);
      expect(monitorLogItem.metadata).toEqual({});
    });
  });

  describe('toPersistence', () => {
    it('should return a MonitorLogDTO with all fields', () => {
      const persistedItem = monitorLogFactory.toPersistence(sampleMonitorLog);
      expect(persistedItem).toEqual(sampleMonitorLog);
    });

    it('should handle missing optional fields', () => {
      const minimalLog = {
        id: MONITOR_LOG_ID,
        channel: 'test-channel',
        timestamp: [new Date()],
        message: 'Test message',
        level: 'INFO'
      };

      const persistedItem = monitorLogFactory.toPersistence(minimalLog);
      expect(persistedItem.id).toEqual(MONITOR_LOG_ID);
      expect(persistedItem.metadata).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a new MonitorLog with generated ID', () => {
      const newLog = monitorLogFactory.create({
        channel: 'test-channel',
        message: 'Test message',
        level: 'INFO'
      });

      expect(newLog.id).toEqual(MONITOR_LOG_ID);
      expect(newLog.timestamp).toBeDefined();
      expect(newLog.metadata).toEqual({});
    });

    it('should preserve provided ID and timestamp', () => {
      const customId = 'custom-id';
      const customTimestamp = [new Date()];

      const newLog = monitorLogFactory.create({
        id: customId,
        channel: 'test-channel',
        timestamp: customTimestamp,
        message: 'Test message',
        level: 'INFO',
        metadata: {
          flowArn: 'test-arn'
        }
      });

      expect(newLog.id).toEqual(customId);
      expect(newLog.timestamp).toEqual(customTimestamp);
      expect(newLog.metadata).toEqual({ flowArn: 'test-arn' });
    });
  });
});