import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Platform from '../../shared/Platform';
import { PlatformError } from '../../shared/PlatformError';
import PlatformMap from '../../shared/PlatformMap';
import PlatformRepository from '../../shared/PlatformRepository';
import UpdatePlatformDomain from '../UpdatePlatformDomain';

const TEST_TABLE_NAME = 'test-updatePlatformDomain';

const uid = new UIDGenerator();
const platformMap = new PlatformMap(uid);
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
const platformRepository = new PlatformRepository(
  ddbClient,
  TEST_TABLE_NAME,
  platformMap,
);
const domain = new UpdatePlatformDomain(platformRepository, platformMap, logTracker);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-11-30'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('UpdatePlatformDomain', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe('updatePlatform', () => {
    const platform = Platform.create({
      name: 'Local Now',
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      extId: 'local:now',
      enabled: true,
    }, '1');

    const existingPlatform = Platform.create({
      name: 'Local 2',
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      extId: 'local:2',
      enabled: true,
    }, '2');

    it('should throw Platform Not Found', async () => {
      await expect(async () => domain.updatePlatform('1', {
        name: 'Brand new Name',
      })).rejects.toThrow(PlatformError.PlatformNotFound);
    });

    it('should update a Platform name with correct updatedAt time', async () => {
      await platformRepository.save(platform);

      expect(await domain.updatePlatform('1', {
        name: 'Brand new Name',
      })).toBeTruthy();

      expect(await platformRepository.findOne('1')).toEqual({
        ...platform,
        updatedAt: '2022-11-30T00:00:00.000Z', // Should be the value as jest.setSystemTime()
        name: 'Brand new Name',
      });
    });

    it('should throw an error if extId already exist on another Platform', async () => {
      await platformRepository.save(existingPlatform);

      await expect(async () => domain.updatePlatform('1', {
        extId: 'local:2', // This id already exist in db
      })).rejects.toThrow(PlatformError.PlatformAlreadyExist);

      expect(await platformRepository.findOne('2')).toEqual(existingPlatform);
    });

    it('should update a Platform extId and name', async () => {
      expect(await domain.updatePlatform('1', {
        name: 'Again a new name',
        extId: 'local:1', // This id doesn't exist in db
        enabled: false,
      })).toBeTruthy();

      expect(await platformRepository.findOne('1')).toEqual({
        id: '1',
        name: 'Again a new name',
        createdAt: '2022-11-10T17:10:000Z',
        updatedAt: '2022-11-30T00:00:00.000Z', // Should be the value as jest.setSystemTime()
        enabled: false,
        extId: 'local:1',
      });
    });
  });
});
