import PlatformMap from '../PlatformMap';

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
const platformMap = new PlatformMap(uid);

describe('PlatformMap', () => {
  describe('toDomain', () => {
    it('should create a new Platform with all required members', () => {
      const platform = platformMap.toDomain({
        extId: 'reality',
        name: 'Reality',
      });

      expect(platform).toMatchObject({
        id: '42',
        updatedAt: '2022-10-17T00:00:00.000Z',
        createdAt: '2022-10-17T00:00:00.000Z',
        extId: 'reality',
        name: 'Reality',
      });

      expect(platform.updatedAt).toEqual(platform.createdAt);
    });

    it('should create a Platform from an existing platform', () => {
      const platform = platformMap.toDomain({
        id: 'Existing Id',
        extId: 'reality',
        name: 'Reality',
        updatedAt: '2022-10-10T00:00:00.000Z',
        createdAt: '2022-10-10T00:00:00.000Z',
      });

      expect(platform).toMatchObject({
        id: 'Existing Id',
        extId: 'reality',
        name: 'Reality',
        updatedAt: '2022-10-10T00:00:00.000Z',
        createdAt: '2022-10-10T00:00:00.000Z',
      });

      expect(platform.updatedAt).toEqual(platform.createdAt);
    });
  });

  describe('toPersistence', () => {
    it('should return a PlatformDto', () => {
      const platform = platformMap.toDomain({
        extId: 'reality',
        name: 'Reality',
      });
      expect(platformMap.toPersistence(platform)).toEqual({
        id: '42',
        updatedAt: '2022-10-17T00:00:00.000Z',
        createdAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
        extId: 'reality',
        name: 'Reality',
      });
    });
  });
});
