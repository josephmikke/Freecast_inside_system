import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import eventMock from '../../shared/tests/event-mock';
import GenreMap from '../../shared/GenreMap';
import GenreRepository from '../../shared/GenreRepository';
import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetGenresDomain from '../GetGenresDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-getGenreAdaptor';

const client = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

describe('ApiGatewayAdaptor', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(client, TEST_TABLE_NAME, 'drop');
  });
  const mock = {
    ...eventMock,
  };

  const genreMap = new GenreMap(new UIDGenerator());

  describe('success path', () => {
    const genreRepository = new GenreRepository(
      client,
      TEST_TABLE_NAME,
      genreMap,
    );
    const domain = new GetGenresDomain(genreRepository);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    it('should return a status code 200 with an empty Genre array', async () => {
      expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
        body: '{"genres":[]}',
        statusCode: 200,
      });
    });

    it('should return a status code 200 with all genres', async () => {
      const genres = await Promise.all(Array.from(Array(20)
        .keys()).map(async (item, key) => {
        const genre = genreMap.toDomain({
          name: `Genre ${key}`,
          extId: `genre-${key}`,
          weight: key,
        });
        await genreRepository.save(genre);
        return genre;
      }));
      expect(await apiGatewayAdaptor.handler(mock)).toMatchObject({
        body: JSON.stringify({ genres }),
        statusCode: 200,
      });
    });
  });

  describe('error path', () => {
    it('should throw an error 500 - Empty table name', async () => {
      const genreRepository = new GenreRepository(
        client,
        '',
        genreMap,
      );
      const domain = new GetGenresDomain(genreRepository);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      expect(await apiGatewayAdaptor.handler(mock)).toEqual({ body: '', statusCode: 500 });
    });
  });
});
