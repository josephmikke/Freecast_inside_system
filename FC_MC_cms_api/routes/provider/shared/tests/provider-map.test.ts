import { ProviderContentType, ProviderNumberFormat } from '../../../shared/dto/ProviderDto';
import Provider from '../Provider';
import ProviderMap from '../ProviderMap';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const PROVIDER_ID = new UIDGenerator().generate(8);
const uid = {
  generate: () => PROVIDER_ID,
};
const providerMap = new ProviderMap(uid);

const providerProps = {
  configuration: {},
  format: ProviderNumberFormat.DECIMAL,
  subscription: false,
  type: [ProviderContentType.CHANNELS],
  extId: 'local-now',
  name: 'Local Now',
  enabled: true,
  mtSlug: 'prod_vod_LocalNow',
  aidSlug: '123456',
};

const expectedProvider = Provider.create({
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  configuration: {},
  format: ProviderNumberFormat.DECIMAL,
  subscription: false,
  type: [ProviderContentType.CHANNELS],
  extId: 'local-now',
  name: 'Local Now',
  enabled: true,
  mtSlug: 'prod_vod_LocalNow',
  aidSlug: '123456',
}, PROVIDER_ID);

describe('ProviderMap', () => {
  describe('toDomain', () => {
    it('should create a Provider with all required members', () => {
      const provider = providerMap.toDomain(providerProps);
      expect(provider).toMatchObject(expectedProvider);
      expect(provider.updatedAt).toEqual(provider.createdAt);
    });
  });

  describe('toDto', () => {
    it('should create a Provider instance from an existing id', () => {
      const provider = providerMap.toDto({
        id: PROVIDER_ID,
        createdAt: '2022-10-17T00:00:00.000Z',
        updatedAt: '2022-10-17T00:00:00.000Z',
        ...providerProps,
      });
      expect(provider.id).toEqual(PROVIDER_ID);
      expect(provider.createdAt).toEqual('2022-10-17T00:00:00.000Z');
    });
  });
});
