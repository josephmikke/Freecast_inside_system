import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Provider from '../../shared/Provider';
import { ProviderError } from '../../shared/ProviderError';
import ProviderMap from '../../shared/ProviderMap';
import ProviderRepository from '../../shared/ProviderRepository';
import UpdateProviderDomain from '../UpdateProviderDomain';

const TEST_TABLE_NAME = 'test-updateProviderDomain';

const uid = new UIDGenerator();
const providerMap = new ProviderMap(uid);
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
const providerRepository = new ProviderRepository(
  ddbClient,
  TEST_TABLE_NAME,
  providerMap,
);
const domain = new UpdateProviderDomain(providerRepository, providerMap, logTracker);

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-11-30'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('UpdateProviderDomain', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe('updateProvider', () => {
    const provider = Provider.create({
      configuration: {},
      type: [ProviderContentType.CHANNELS],
      subscription: false,
      format: ProviderNumberFormat.INTEGER,
      name: 'Local Now',
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      extId: 'local:now',
      enabled: true,
      mtSlug: 'prod_vod_LocalNow',
      aidSlug: '123456',
    }, '1');

    const existingProvider = Provider.create({
      configuration: {},
      type: [ProviderContentType.CHANNELS],
      subscription: false,
      format: ProviderNumberFormat.INTEGER,
      name: 'Local 2',
      createdAt: '2022-11-10T17:10:000Z',
      updatedAt: '2022-11-10T17:10:000Z',
      extId: 'local:2',
      enabled: true,
      mtSlug: 'prod_vod_LocalNow2',
      aidSlug: '789012',
    }, '2');

    it('should throw Provider Not Found', async () => {
      await expect(async () => domain.updateProvider('1', {
        name: 'Brand new Name',
      })).rejects.toThrow(ProviderError.ProviderNotFound);
    });

    it('should update a Provider name with correct updatedAt time', async () => {
      await providerRepository.save(provider);

      expect(await domain.updateProvider('1', {
        name: 'Brand new Name',
      })).toBeTruthy();

      expect(await providerRepository.findOne('1')).toEqual({
        ...provider,
        updatedAt: '2022-11-30T00:00:00.000Z', // Should be the value as jest.setSystemTime()
        name: 'Brand new Name',
      });
    });

    it('should throw an error if extId already exist on another Provider', async () => {
      await providerRepository.save(existingProvider);

      await expect(async () => domain.updateProvider('1', {
        extId: 'local:2', // This id already exist in db
      })).rejects.toThrow(ProviderError.ProviderAlreadyExist);

      expect(await providerRepository.findOne('2')).toEqual(existingProvider);
    });

    it('should update a Provider extId and name', async () => {
      expect(await domain.updateProvider('1', {
        name: 'Again a new name',
        extId: 'local:1', // This id doesn't exist in db
        enabled: false,
      })).toBeTruthy();

      expect(await providerRepository.findOne('1')).toEqual({
        ...provider,
        name: 'Again a new name',
        extId: 'local:1',
        updatedAt: '2022-11-30T00:00:00.000Z',
        enabled: false,
      });
    });
  });
});
