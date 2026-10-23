import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { LocationType } from '../../../shared/dto/LocationDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Location from '../../shared/Location';
import LocationFactory from '../../shared/LocationFactory';
import LocationRepository from '../../shared/LocationRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeleteLocationDomain from '../DeleteLocationDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const TEST_TABLE_NAME = 'test-deleteLocationAdaptor';
const LOCATION_ID = new UIDGenerator().generate(8);
const ORPHAN_LOCATION_ID = new UIDGenerator().generate(8);
const CITY_LOCATION_ID = new UIDGenerator().generate(8);
const ZIPCODE_LOCATION_ID = new UIDGenerator().generate(8);

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

const handlerPayloadMock = {
  ...eventMock,
  pathParameters: {
    id: LOCATION_ID,
  },
};

const locationDto = {
  name: 'Location package',
  slug: 'package-loc',
  extId: 'package-loc',
  type: LocationType.PACKAGE,
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};

const locationCityDto = {
  name: 'Location city',
  slug: 'package-city',
  extId: 'package-city',
  type: LocationType.CITY,
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};

const uid = {
  generate: () => LOCATION_ID,
};

const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TEST_TABLE_NAME, platformMap);

const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);

const locationMap = new LocationFactory(uid, packageRepository);
const locationRepository = new LocationRepository(
  ddbClient,
  TEST_TABLE_NAME,
  locationMap,
);
const domain = new DeleteLocationDomain(locationRepository, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const city = Location.create(locationCityDto, CITY_LOCATION_ID);
const locationZPDto = {
  name: 'Location zipcode',
  slug: 'package-zipcode',
  extId: 'package-zipcode',
  type: LocationType.ZIPCODE,
  cities: [city.id],
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};
const zipcode = Location.create(locationZPDto, ZIPCODE_LOCATION_ID);

const CASES = [{
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: ORPHAN_LOCATION_ID } },
  expected: {
    body: '',
    statusCode: 204,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: 'random' } },
  expected: {
    body: '{"error":"Location Not Found"}',
    statusCode: 404,
  },
},
{
  mockEvent: handlerPayloadMock,
  expected: {
    body: '{"error":"Cannot delete a Location with dependencies"}',
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
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    const locationItem = Location.create(locationDto, LOCATION_ID);
    const orphanLocation = Location.create(locationDto, ORPHAN_LOCATION_ID);
    await locationRepository.save(locationItem);
    await locationRepository.save(orphanLocation);
    await locationRepository.save(city);
    await locationRepository.save(zipcode);

    const itemsAttachedToLocation = Array.from(Array(2).keys()).map((_, key) => ({
      PK: `C#${key}`,
      SK: `ASSET#LOCATION#${locationItem.type}#${LOCATION_ID}`,
      entityType: 'CHANNEL',
      'GSI1-PK': `ASSET#LOCATION#${locationItem.type}#${LOCATION_ID}`,
      'GSI1-SK': `C#${key}`,
    }));
    await locationRepository.batchWriteItem(itemsAttachedToLocation);
  });

  it('should delete without issue', async () => {
    expect(await locationRepository.remove(zipcode)).toBeTruthy();
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
    });
  });
});
