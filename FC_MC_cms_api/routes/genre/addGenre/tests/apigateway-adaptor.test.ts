import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import GenreMap from '../../shared/GenreMap';
import GenreRepository from '../../shared/GenreRepository';
import eventMock from '../../shared/tests/event-mock';
import AddGenreDomain from '../AddGenreDomain';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-addGenreAdaptor';

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}
const logTracker = new MockLogTracker();

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const GENRE_ID = new UIDGenerator().generate(8);
const uid = {
  generate: () => GENRE_ID,
};
const genreMap = new GenreMap(uid);
const genreRepository = new GenreRepository(
  ddbClient,
  TEST_TABLE_NAME,
  genreMap,
);
const domain = new AddGenreDomain(genreRepository, genreMap, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const mock = {
  ...eventMock,
  body: {
    extId: 'extId:extId',
    name: 'Test',
  },
};

const CASES = [{
  mockEvent: mock,
  expected: {
    body: '',
    headers: {
      Location: `/genres/${GENRE_ID}`,
    },
    statusCode: 201,
  },
}, {
  mockEvent: mock,
  expected: {
    body: '{"error":"Genre already exist"}',
    statusCode: 409,
  },
}];

beforeAll(async () => {
  await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
});

afterAll(async () => {
  await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
});

describe('addGenre - ApiGatewayAdaptor', () => {
  describe('handler', () => {
    it('should return 500 as status code', async () => {
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler({ ...mock, body: undefined })).toStrictEqual({
        body: '',
        statusCode: 500,
      });
    });
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
    });
  });
});
