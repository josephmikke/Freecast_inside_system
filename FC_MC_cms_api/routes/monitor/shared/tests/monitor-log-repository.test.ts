import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';
import MonitorLogFactory from '../MonitorLogFactory';
import MonitorLogRepository from '../MonitorLogRepository';
import { MonitorLogDTO } from '../../../shared/dto/MonitorLogDto';

const TABLE_NAME = 'test-monitorLogRepository';

describe('MonitorLogRepository', () => {
  let ddbClient: DynamoDBClient;
  let monitorLogFactory: MonitorLogFactory;
  let monitorLogRepository: MonitorLogRepository;
  let uid: UIDGenerator;

  beforeAll(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2022-10-17'));

    ddbClient = new DynamoDBClient({
      endpoint: 'http://localhost:8000',
      region: 'localhost',
      credentials: {
        accessKeyId: 'xxx',
        secretAccessKey: 'yyy',
      },
    });

    uid = new UIDGenerator();
    monitorLogFactory = new MonitorLogFactory(uid);
    monitorLogRepository = new MonitorLogRepository(
      ddbClient,
      TABLE_NAME,
      monitorLogFactory
    );

    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
    jest.useRealTimers();
  });

  const createSampleMonitorLog = (overrides = {}): MonitorLogDTO => ({
    id: uid.generate(8),
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
    },
    ...overrides
  });

  describe('save', () => {
    it('should successfully save a monitor log', async () => {
      const monitorLog = createSampleMonitorLog();
      const result = await monitorLogRepository.save(monitorLog);
      expect(result).toBe(true);
    });

    it('should throw error when saving invalid data', async () => {
      const invalidLog = {
        ...createSampleMonitorLog({ channel: undefined })
      };

      await expect(monitorLogRepository.save(invalidLog)).rejects.toThrow('Invalid monitor log data');
    });
  });

  describe('findOne', () => {
    let savedLog: MonitorLogDTO;

    beforeEach(async () => {
      savedLog = createSampleMonitorLog();
      await monitorLogRepository.save(savedLog);
    });

    // findOne queries the GSI by flow-name, so it answers with every log for that flow.
    it('should find the saved monitor log among the logs for its flow', async () => {
      const result = await monitorLogRepository.findOne(savedLog.channel);
      const found = result.find((log) => log.id === savedLog.id);
      expect(found).toBeDefined();
      expect(found!.channel).toBe(savedLog.channel);
      expect(found!.message).toBe(savedLog.message);
      expect(found!.level).toBe(savedLog.level);
      expect(found!.metadata).toEqual(savedLog.metadata);
    });

    it('should return an empty array for a non-existent flow', async () => {
      const result = await monitorLogRepository.findOne('non-existent-flow');
      expect(result).toEqual([]);
    });
  });

  describe('exists', () => {
    let savedLog: MonitorLogDTO;

    beforeEach(async () => {
      savedLog = createSampleMonitorLog();
      await monitorLogRepository.save(savedLog);
    });

    it('should return true for existing monitor log', async () => {
      const exists = await monitorLogRepository.exists(savedLog);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent monitor log', async () => {
      const nonExistentLog = createSampleMonitorLog({
        metadata: { extId: 'non-existent' }
      });
      const exists = await monitorLogRepository.exists(nonExistentLog);
      expect(exists).toBe(false);
    });
  });

  describe('findAll', () => {
    beforeEach(async () => {
      // Clear existing data
      const existingLogs = await monitorLogRepository.findAll();
      await Promise.all(
        existingLogs.map(async (log) => {
          const item = marshall({
            PK: `ASSET#ALARM#${log.id}`,
            SK: `ASSET#ALARM#${log.id}`
          });
          await ddbClient.send(new DeleteItemCommand({
            TableName: TABLE_NAME,
            Key: item
          }));
        })
      );
    });

    it('should return empty array when no logs exist', async () => {
      const results = await monitorLogRepository.findAll();
      expect(results).toEqual([]);
    });

    it('should return all monitor logs', async () => {
      const logs = [
        createSampleMonitorLog({ level: 'INFO' }),
        createSampleMonitorLog({ level: 'ERROR' }),
        createSampleMonitorLog({ level: 'WARN' })
      ];

      await Promise.all(logs.map(log => monitorLogRepository.save(log)));

      const results = await monitorLogRepository.findAll();
      expect(results).toHaveLength(3);
      expect(results.map(r => r.level)).toEqual(
        expect.arrayContaining(['INFO', 'ERROR', 'WARN'])
      );
    });
  });

  describe('error handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      // Create repository with invalid table name to force error
      const invalidRepository = new MonitorLogRepository(
        ddbClient,
        'non-existent-table',
        monitorLogFactory
      );

      await expect(invalidRepository.findAll()).rejects.toThrow();
      await expect(invalidRepository.findOne('any-id')).rejects.toThrow();
      await expect(invalidRepository.exists(createSampleMonitorLog())).rejects.toThrow();
      await expect(invalidRepository.save(createSampleMonitorLog())).rejects.toThrow();
    });
  });
});
