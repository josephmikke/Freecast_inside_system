import { initDatabase } from '../../../../utils/jest-utils';
import { GenreDto } from '../../../shared/dto/GenreDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Genre from '../../shared/Genre';
import GenreMap from '../../shared/GenreMap';
import GenreRepository from '../../shared/GenreRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeleteGenreDomain from '../DeleteGenreDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const GENRE_ID = new UIDGenerator().generate(8);
const ORPHAN_GENRE_ID = new UIDGenerator().generate(8);

class MockLogTracker implements ILogTracker<TrackDto> {
  track(_: TrackDto): Promise<void> {
    return Promise.resolve();
  }
}
const logTracker = new MockLogTracker();

const { TEST_TABLE_NAME, ddbClient } = initDatabase('test-deleteGenreAdaptor');
const handlerPayloadMock = {
  ...eventMock,
  pathParameters: {
    id: GENRE_ID,
  },
};

const genreDto: Required<Omit<GenreDto, 'id'>> = {
  extId: 'local:local-now',
  name: 'Local Now',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  weight: 1,
  enabled: true,
};

const uid = {
  generate: () => GENRE_ID,
};

const genreMap = new GenreMap(uid);
const genreRepository = new GenreRepository(
  ddbClient,
  TEST_TABLE_NAME,
  genreMap,
);
const domain = new DeleteGenreDomain(genreRepository, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const CASES = [{
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: ORPHAN_GENRE_ID } },
  expected: {
    body: '',
    statusCode: 204,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: 'random' } },
  expected: {
    body: '{"error":"Genre Not Found"}',
    statusCode: 404,
  },
},
{
  mockEvent: handlerPayloadMock,
  expected: {
    body: '{"error":"Cannot delete a Genre with dependencies"}',
    statusCode: 422,
  },
},
{
  mockEvent: { ...handlerPayloadMock, pathParameters: undefined },
  expected: {
    body: '',
    statusCode: 500,
  },
}];

describe('ApiGatewayAdaptor', () => {
  describe('Weight', () => {
    it('should update weight of other items on delete', async () => {
      // Arrange
      await Promise.all(Array.from(Array(10)
        .keys()).map(async (item, key) => {
        const genre = Genre.create({ ...genreDto, weight: key }, key.toString());
        await genreRepository.save(genre);
      }));

      // Act
      const beforeDelete = await genreRepository.findAll();
      const result = await apiGatewayAdaptor.handler({ ...handlerPayloadMock, pathParameters: { id: '4' } });
      const afterDelete = await genreRepository.findAll();

      // Assert
      expect(result).toEqual({
        body: '',
        statusCode: 204,
      });
      expect(beforeDelete).toHaveLength(10);
      expect(beforeDelete[9].weight).toEqual(9);
      expect(afterDelete).toHaveLength(9);
      expect(afterDelete[8].weight).toEqual(8);
    });
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      const genre = Genre.create(genreDto, GENRE_ID);
      const orphanGenre = Genre.create(genreDto, ORPHAN_GENRE_ID);
      await genreRepository.save(genre);
      await genreRepository.save(orphanGenre);

      const itemsAttachedToGenre = Array.from(Array(2).keys()).map((_, key) => ({
        PK: `C#${key}`,
        SK: `ASSET#GENRE#${GENRE_ID}`,
        entityType: 'CHANNEL',
        'GSI1-PK': `ASSET#GENRE#${GENRE_ID}`,
        'GSI1-SK': `C#${key}`,
      }));
      await genreRepository.batchWriteItem(itemsAttachedToGenre);
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
    });
  });
});
