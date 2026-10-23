import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../../utils/database-table-utils';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { MrssIngestionStatus } from '../../../../shared/dto/vod/IngestDto';
import Ingestion from '../../shared/Ingestion';
import IngestionFactory from '../../shared/IngestionFactory';
import IngestionRepository from '../../shared/IngestionRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetIngestionsDomain from '../GetIngestionsDomain';

const TEST_TABLE_NAME = 'test-GetIngestionsAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const uid = new UIDGenerator();

const ingestionFactory = new IngestionFactory(
  uid,
);

const ingestionRepository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);

const domain = new GetIngestionsDomain(ingestionRepository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const CASES = [{
  mockEvent: {
    ...eventMock,
  },
  expected: {
    body: '',
    statusCode: 200,
  },
}, {
  mockEvent: {
    ...eventMock,
    queryStringParameters: {
      limit: '1',
    },
  },
  expected: {
    body: '',
    statusCode: 200,
  },
}];

describe('Get Ingestion ApiGatewayAdaptor', () => {
  let count = 0;
  let ingestion: Ingestion;
  let ingestion2: Ingestion;

  const ingestionDto = {
    extId: 'ingestion-extId',
    parentId: 'parent-id',
    status: MrssIngestionStatus.IN_PROGRESS,
  };

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');

    ingestion = await ingestionFactory.toDomain({
      ...ingestionDto,
      id: '1',
    });

    ingestion2 = await ingestionFactory.toDomain({
      ...ingestionDto,
      id: '2',
    });

    await ingestionRepository.save(ingestion);
    await ingestionRepository.save(ingestion2);
  });

  afterEach(() => {
    count += 1;
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    beforeAll(async () => {
      CASES[0].expected.body = JSON.stringify({
        ingestions: [ingestion, ingestion2],
      });
      CASES[1].expected.body = JSON.stringify({
        ingestions: [ingestion],
      });
    });

    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      const response = await apiGatewayAdaptor.handler(mockEvent);
      expect(response.statusCode).toStrictEqual(expected.statusCode);
      if (response.statusCode !== 500) {
        const resBody = JSON.parse(response.body);
        expect(resBody.ingestions).toStrictEqual(JSON.parse(expected.body).ingestions);
        if (count) {
          expect(resBody.nextToken).toBeDefined();
        }
      } else {
        expect(response.body).toStrictEqual(expected.body);
      }
    });
  });
});
