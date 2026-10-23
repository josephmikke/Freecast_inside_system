import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../../utils/database-table-utils';
import { IngestionRequestDto, MrssIngestionStatus } from '../../../../shared/dto/vod/IngestDto';
import Ingestion from '../../shared/Ingestion';
import IngestionFactory from '../../shared/IngestionFactory';
import IngestionRepository from '../../shared/IngestionRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetIngestionDomain from '../GetIngestionDomain';

const TEST_TABLE_NAME = 'test-GetIngestionAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const INGESTION_ID = 'my-ingestion-id';

const uidIngestion = {
  generate: () => INGESTION_ID,
};

const ingestionFactory = new IngestionFactory(
  uidIngestion,
);

const ingestionRepository = new IngestionRepository(ddbClient, TEST_TABLE_NAME, ingestionFactory);

const domain = new GetIngestionDomain(ingestionRepository);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const handlerPayloadMock = {
  ...eventMock,
  pathParameters: {
    id: INGESTION_ID,
  },
};

const CASES = [{
  mockEvent: {
    ...handlerPayloadMock,
    pathParameters: { id: INGESTION_ID },
  },
  expected: {
    body: '',
    statusCode: 200,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: INGESTION_ID } },
  expected: {
    body: '',
    statusCode: 200,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: 'random' } },
  expected: {
    body: '{"error":"Ingestion Not Found"}',
    statusCode: 404,
  },
},
{
  mockEvent: { ...handlerPayloadMock, pathParameters: undefined },
  expected: {
    body: '',
    statusCode: 500,
  },
}];

describe('Get Ingestion ApiGatewayAdaptor', () => {
  let ingestion: Ingestion;
  let count = 3;

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

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    beforeAll(async () => {
      CASES[0].expected.body = JSON.stringify(ingestion);
      if (count > 1) {
        const ingestion2 = await ingestionFactory.toDomain(
          await ingestionFactory.toPersistence(ingestion),
        );
        CASES[1].expected.body = JSON.stringify(ingestion2);
      }
    });
    afterAll(async () => {
      count -= 1;
    });

    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      const response = await apiGatewayAdaptor.handler(mockEvent);
      expect(response.statusCode).toStrictEqual(expected.statusCode);
      if (response.statusCode !== 500) {
        expect(JSON.parse(response.body)).toStrictEqual(JSON.parse(expected.body));
      } else {
        expect(response.body).toStrictEqual(expected.body);
      }
    });
  });
});
