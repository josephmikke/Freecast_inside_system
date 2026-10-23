import CategoryMap from '../CategoryMap';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('Channel', () => {
  const uid = {
    generate: () => '42',
  };
  const categoryMap = new CategoryMap(uid);

  describe('toDomain', () => {
    it('should create a Category with all required members', () => {
      const category = categoryMap.toDomain({
        extId: 'local:local-now',
        name: 'Local now',
        weight: 0,
      });

      expect(category).toMatchObject({
        id: '42',
        updatedAt: '2022-10-17T00:00:00.000Z',
        createdAt: '2022-10-17T00:00:00.000Z',
        extId: 'local:local-now',
        name: 'Local now',
      });

      expect(category.updatedAt).toEqual(category.createdAt);
    });
  });

  describe('toDto', () => {
    it('should create a Category instance from an existing id', () => {
      const category = categoryMap.toDto({
        createdAt: 'fromDB',
        extId: 'local:local-now',
        id: 'FIXED',
        name: 'Local now',
        updatedAt: 'fromDB',
        weight: 1,
      });
      expect(category.id).toEqual('FIXED');
      expect(category.createdAt).toEqual('fromDB');
    });
  });
});
