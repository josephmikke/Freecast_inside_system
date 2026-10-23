import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Genre from '../../shared/Genre';
import { GenreError } from '../../shared/GenreError';
import GenreMap from '../../shared/GenreMap';
import GenreRepository from '../../shared/GenreRepository';
import UpdateGenreDomain from '../UpdateGenreDomain';

const TEST_TABLE_NAME = 'test-updateGenreDomain';

const uid = new UIDGenerator();
const genreMap = new GenreMap(uid);
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
const genreRepository = new GenreRepository(
  ddbClient,
  TEST_TABLE_NAME,
  genreMap,
);
const domain = new UpdateGenreDomain(genreRepository, genreMap, logTracker);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-11-30'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('UpdateGenreDomain', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe('updateGenre', () => {
    const genre = Genre.create({
      name: 'Local Now',
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      extId: 'local:now',
      enabled: true,
      weight: 1,
    }, '1');

    const existingGenre = Genre.create({
      name: 'Local 2',
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      extId: 'local:2',
      enabled: true,
      weight: 2,
    }, '2');

    it('should throw Genre Not Found', async () => {
      await expect(async () => domain.updateGenre('1', {
        name: 'Brand new Name',
      })).rejects.toThrow(GenreError.GenreNotFound);
    });

    it('should update a Genre name with correct updatedAt time', async () => {
      await genreRepository.save(genre);

      expect(await domain.updateGenre('1', {
        name: 'Brand new Name',
      })).toBeTruthy();

      expect(await genreRepository.findOne('1')).toEqual({
        ...genre,
        updatedAt: '2022-11-30T00:00:00.000Z', // Should be the value as jest.setSystemTime()
        name: 'Brand new Name',
      });
    });

    it('should throw an error if extId already exist on another Genre', async () => {
      await genreRepository.save(existingGenre);

      await expect(async () => domain.updateGenre('1', {
        extId: 'local:2', // This id already exist in db
      })).rejects.toThrow(GenreError.GenreAlreadyExist);

      expect(await genreRepository.findOne('2')).toEqual(existingGenre);
    });

    it('should update a Genre extId and name', async () => {
      expect(await domain.updateGenre('1', {
        name: 'Again a new name',
        extId: 'local:1', // This id doesn't exist in db
        enabled: false,
      })).toBeTruthy();

      expect(await genreRepository.findOne('1')).toEqual({
        id: '1',
        name: 'Again a new name',
        createdAt: '2022-11-10T17:10:000Z',
        updatedAt: '2022-11-30T00:00:00.000Z', // Should be the value as jest.setSystemTime()
        enabled: false,
        weight: 1,
        extId: 'local:1',
      });
    });
  });
});
