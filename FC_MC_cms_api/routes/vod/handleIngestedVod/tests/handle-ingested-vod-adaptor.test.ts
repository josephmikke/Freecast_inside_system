import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { EventBridgeEvent, Context } from 'aws-lambda';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import {
  IngestedVodEvent, IngestionRequestDto, MediaJobStatus, MrssIngestionStatus,
} from '../../../shared/dto/vod/IngestDto';
import Ingestion from '../../ingestion/shared/Ingestion';
import IngestionFactory from '../../ingestion/shared/IngestionFactory';
import IngestionRepository from '../../ingestion/shared/IngestionRepository';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import MockMediaPackage from '../assets/mockMediaPackage';
import HandleIngestedVodAdaptor from '../HandleIngestedVodAdaptor';
import HandleIngestedVodDomain from '../HandleIngestedVodDomain';

const TEST_TABLE_NAME = 'test-handleIngestedVodAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const uid = new UIDGenerator();

const mediapackageIngester = new MockMediaPackage();

const ingestionFactory = new IngestionFactory(uid);

const ingestionRepository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);

class MockDomain extends HandleIngestedVodDomain {
  async setVodStream(
    _ingestedVodEvent: EventBridgeEvent<string, IngestedVodEvent>,
    _context?: Context | undefined,
  ): Promise<void> {
    return console.log('mock setVodStream');
  }
}

const domain = new MockDomain(
  ingestionRepository,
  mediapackageIngester,
  // setVodStream is mocked below, so episode/movie repositories are never invoked in this test.
  undefined as any,
  undefined as any,
);
const adaptor = new HandleIngestedVodAdaptor(domain);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const context: Context = {
  callbackWaitsForEmptyEventLoop: false,
  functionName: '',
  functionVersion: '',
  invokedFunctionArn: '',
  memoryLimitInMB: '',
  awsRequestId: '',
  logGroupName: '',
  logStreamName: '',
  getRemainingTimeInMillis: () => 0,
  done: () => {},
  fail: (_err: Error | string) => {},
  succeed: (_msg: any) => {},
};

const event: EventBridgeEvent<string, IngestedVodEvent> = {
  id: '',
  version: '',
  account: '',
  time: '',
  region: '',
  resources: [],
  source: '',
  'detail-type': 'MediaConvert Job State Change',
  detail: {
    status: 'PROGRESSING',
    userMetadata: {
      ingestionId: '',
      entityId: 'test/entity-id',
      media: 'media-url',
    },
    outputGroupDetails: [],
  },
};

describe('MockMediaPackage', () => {
  it('ingest should return true', async () => {
    const response = await mediapackageIngester.ingest('', '', '');

    expect(response).toBeTruthy();
  });
});

describe('HandleIngestedVodAdaptor', () => {
  let ingestion: Ingestion | undefined;

  const ingestionDto: IngestionRequestDto = {
    extId: 'ingestion-extId',
    parentId: 'parent-id',
    status: MrssIngestionStatus.IN_PROGRESS,
  };

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');

    ingestion = await ingestionFactory.toDomain(ingestionDto);

    await ingestionRepository.save(ingestion);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('Ingestion Entity should not have jobs, failures and saved', () => {
    expect(ingestion).toBeDefined();
    expect(ingestion?.jobs).toEqual({});
    expect(ingestion?.status).toEqual(MrssIngestionStatus.IN_PROGRESS);
    expect(ingestion?.failures).toBeUndefined();
    expect(ingestion?.saved).toBeUndefined();
  });

  it('it should add 2 new jobs with PROGRESSING status', async () => {
    await adaptor.handler({
      ...event,
      detail: {
        status: 'PROGRESSING',
        userMetadata: {
          ingestionId: ingestion?.id,
          entityId: 'test/entity-id',
          media: 'media-url',
        },
        outputGroupDetails: [],
      },
    }, context);
    await adaptor.handler({
      ...event,
      detail: {
        status: 'PROGRESSING',
        userMetadata: {
          ingestionId: ingestion?.id,
          entityId: 'test/entity-id-2',
          media: 'media-url',
        },
        outputGroupDetails: [],
      },
    }, context);

    // Get latest ingestion version
    ingestion = await ingestionRepository.findOne(ingestion?.id ?? '');

    expect(ingestion?.status).toEqual(MrssIngestionStatus.IN_PROGRESS);
    expect(Object.values(ingestion?.jobs ?? []).length).toEqual(2);
    expect(ingestion?.jobs['test/entity-id']).toEqual(MediaJobStatus.MEDIACONVERT_PROGRESSING);
    expect(ingestion?.jobs['test/entity-id-2']).toEqual(MediaJobStatus.MEDIACONVERT_PROGRESSING);
  });

  it('it should update a job with CANCELED status', async () => {
    await adaptor.handler({
      ...event,
      detail: {
        status: 'CANCELED',
        userMetadata: {
          ingestionId: ingestion?.id,
          entityId: 'test/entity-id',
          media: 'media-url',
        },
        outputGroupDetails: [],
      },
    }, context);

    // Get latest ingestion version
    ingestion = await ingestionRepository.findOne(ingestion?.id ?? '');

    expect(ingestion?.status).toEqual(MrssIngestionStatus.IN_PROGRESS);
    expect(Object.values(ingestion?.jobs ?? []).length).toEqual(2);
    expect(ingestion?.jobs['test/entity-id']).toEqual(MediaJobStatus.MEDIACONVERT_CANCELED);
  });

  it('it should update a job with ERROR status + set failure', async () => {
    await adaptor.handler({
      ...event,
      detail: {
        status: 'ERROR',
        errorCode: 123,
        errorMessage: 'TEST-ERROR-MESSAGE',
        userMetadata: {
          ingestionId: ingestion?.id,
          entityId: 'test/entity-id',
          media: 'media-url',
        },
        outputGroupDetails: [],
      },
    }, context);

    // Get latest ingestion version
    ingestion = await ingestionRepository.findOne(ingestion?.id ?? '');

    expect(ingestion?.status).toEqual(MrssIngestionStatus.FAILED);
    expect(Object.values(ingestion?.jobs ?? []).length).toEqual(2);
    expect(ingestion?.jobs['test/entity-id']).toEqual(MediaJobStatus.MEDIACONVERT_ERROR);
    expect(ingestion?.failures?.length).toEqual(1);
    expect(ingestion?.failures?.at(0)).toEqual('2022-10-17T00:00:00.000Z: Transcoding Error: test/entity-id: 123: TEST-ERROR-MESSAGE');
  });

  it('it should update a job with COMPLETE status + set Global Status', async () => {
    ingestion = await ingestionRepository.findOne(ingestion?.id ?? '');
    if (ingestion) { await ingestionRepository.updateStatus(ingestion, 'status', MrssIngestionStatus.IN_PROGRESS); }
    await adaptor.handler({
      ...event,
      detail: {
        status: 'COMPLETE',
        userMetadata: {
          ingestionId: ingestion?.id,
          entityId: 'test/entity-id',
          media: 'media-url',
        },
        outputGroupDetails: [],
      },
    }, context);
    await adaptor.handler({
      ...event,
      detail: {
        status: 'COMPLETE',
        userMetadata: {
          ingestionId: ingestion?.id,
          entityId: 'test/entity-id-2',
          media: 'media-url',
        },
        outputGroupDetails: [],
      },
    }, context);

    // Get latest ingestion version
    ingestion = await ingestionRepository.findOne(ingestion?.id ?? '');

    expect(ingestion?.status).toEqual(MrssIngestionStatus.IN_PROGRESS);
    expect(Object.values(ingestion?.jobs ?? []).length).toEqual(2);
    expect(ingestion?.jobs['test/entity-id-2']).toEqual(MediaJobStatus.MEDIACONVERT_COMPLETE);
    expect(ingestion?.failures?.length).toEqual(1);
  });
});
