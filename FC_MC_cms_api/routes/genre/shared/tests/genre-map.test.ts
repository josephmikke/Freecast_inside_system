import GenreMap from '../GenreMap';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const uid = {
  generate: () => '42',
};
const genreMap = new GenreMap(uid);

describe('GenreMap', () => {
  describe('toDomain', () => {
    it('should create a Genre with all required members', () => {
      const genre = genreMap.toDomain({
        extId: 'reality',
        name: 'Reality',
        weight: 10,
      });

      expect(genre).toMatchObject({
        id: '42',
        updatedAt: '2022-10-17T00:00:00.000Z',
        createdAt: '2022-10-17T00:00:00.000Z',
        extId: 'reality',
        weight: 10,
        name: 'Reality',
      });

      expect(genre.updatedAt).toEqual(genre.createdAt);
    });
  });

  describe('toDto', () => {
    it('should create a Genre instance from an existing id', () => {
      const genre = genreMap.toDto({
        createdAt: 'fromDB',
        id: 'FIXED',
        extId: 'reality',
        weight: 100,
        name: 'Reality',
        updatedAt: 'fromDB',
      });
      expect(genre.id).toEqual('FIXED');
      expect(genre.weight).toEqual(100);
      expect(genre.createdAt).toEqual('fromDB');
    });
  });
});
