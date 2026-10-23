import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { MonitorLogDTO } from '../../../shared/dto/MonitorLogDto';
import eventMock from '../../shared/tests/event-mock';
import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import MonitorLogFactory from '../../shared/MonitorLogFactory';
import MonitorLogRepository from '../../shared/MonitorLogRepository';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetMonitorLogsDomain from '../GetMonitorLogsDomain';
import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-getMonitorLogs';

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
const monitorLogRepository = new MonitorLogRepository(ddbClient, TEST_TABLE_NAME, monitorLogFactory);

describe('ApiGatewayAdaptor', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });
  const domain = new GetMonitorLogsDomain(monitorLogRepository);
  const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

  // Relative to now: the repository only returns logs from the last 24 hours, so a
  // hard-coded date silently stops matching once it ages out.
  const timestamp = [new Date(Date.now() - 60 * 60 * 1000)];

  const sampleLog: MonitorLogDTO = {
    id: 'cb7f6bf2-4d9c-257e-19e9-9737af07aaa1',
    channel: 'vubiquity_Value_AXS_TV',
    timestamp: timestamp,
    message: 'Flow Stream Error: Timeout. Please investigate flow source(s).',
    level: 'FlowStreamError',
    metadata: {
      flowArn: 'arn:aws:mediaconnect:us-east-1:199718138082:flow:1-DggMDVZYBlIMUQsI-3fb93a2b7022:vubiquity_Value_AXS_TV',
      extId: 'f1IsVg8PuYgnYyE8weze+VU/qHM',
      createdAt: '2025-03-19T04:50:10.104Z',
      updatedAt: '2025-03-19T04:50:10.104Z',
      entity: 'Alarm',
      title: 'FlowStreamError'
    }
  };

  describe('success path', () => {
    it('should return a status code 200 with the requested log', async () => {
      // First save the log
      const savedResult = await monitorLogRepository.save(sampleLog);
      expect(savedResult).toBe(true);

      // Verify the log was saved
      const savedLog = await monitorLogRepository.findOne(sampleLog.id);
      expect(savedLog).toBeDefined();

      const mock = {
        ...eventMock,
        pathParameters: {
          id: sampleLog.id,
          channel: sampleLog.channel
        }
      };

      const response = await apiGatewayAdaptor.handler(mock);
      expect(response.statusCode).toBe(200);

      const responseBody = JSON.parse(response.body);
      expect(responseBody[0]).toMatchObject({
        id: sampleLog.id,
        channel: sampleLog.channel,
        // JSON has no Date, so event times come back as ISO strings.
        timestamp: sampleLog.timestamp.map((time) => time.toISOString()),
        message: sampleLog.message,
        level: sampleLog.level,
        metadata: expect.objectContaining(sampleLog.metadata)
      });
    });
  });

  describe('error path', () => {
    it('should handle database errors gracefully', async () => {
      const mock = {
        ...eventMock,
        pathParameters: {
          channel: 'test-channel'
        }
      };

      jest.spyOn(monitorLogRepository, 'findAll').mockRejectedValueOnce(new Error('Database error'));

      await expect(apiGatewayAdaptor.handler(mock)).rejects.toThrow('Database error');
    });
  });
});
