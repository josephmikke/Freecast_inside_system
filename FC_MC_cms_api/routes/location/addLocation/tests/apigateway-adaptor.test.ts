import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import Package from '../../../package/shared/Package';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { LocationType } from '../../../shared/dto/LocationDto';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import Location from '../../shared/Location';
import LocationFactory from '../../shared/LocationFactory';
import LocationRepository from '../../shared/LocationRepository';
import eventMock from '../../shared/tests/event-mock';
import AddLocationDomain from '../AddLocationDomain';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const TEST_TABLE_NAME = 'test-addLocationAdaptor';

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

const LOCATION_ID = new UIDGenerator().generate(8);
const PACKAGE_ID = new UIDGenerator().generate(8);
const COUNTRY_ID = new UIDGenerator().generate(8);
const locationUid = {
  generate: () => LOCATION_ID,
};

const platformMap = new PlatformMap(locationUid);
const platformRepository = new PlatformRepository(ddbClient, TEST_TABLE_NAME, platformMap);

const packageFactory = new PackageFactory(locationUid, platformRepository);
const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);

const locationFactory = new LocationFactory(locationUid, packageRepository);
const locationRepository = new LocationRepository(
  ddbClient,
  TEST_TABLE_NAME,
  locationFactory,
);

const domain = new AddLocationDomain(locationRepository, locationFactory, logTracker);
const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

const locationPackageDto = {
  slug: 'location-package-us',
  extId: 'location-package-us',
  name: 'US',
  type: LocationType.PACKAGE,
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};

const locationPackage = Location.create(locationPackageDto, PACKAGE_ID);

const locationZipcode = locationFactory.toDomain({
  id: 'zipcode-id',
  slug: 'location-zipcode-us',
  name: 'US-zipcode',
  type: LocationType.ZIPCODE,
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
});

const locationCountry = Location.create({
  slug: 'location-country-us',
  extId: 'location-country-us',
  name: 'US',
  type: LocationType.COUNTRY,
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
}, COUNTRY_ID);

const packageAffiliation = Package.create({
  extId: 'location-package-wu',
  name: 'Western Union',
  description: 'description',
  type: PackageType.INTERNAL,
  price: 'free',
  revenueModel: RevenueModel.FREE,
  default: true,
  thumbnail: 'package/packageid/thumbnail.png',
  createdAt: '2022-10-17T00:00:00.000Z',
  updatedAt: '2022-10-17T00:00:00.000Z',
  enabled: true,
  weight: 0,
}, 'first-package-entity');

const mock = {
  ...eventMock,
  body: {
    name: 'United States',
    slug: 'country-us',
    extId: 'country-us',
    type: LocationType.STATE,
    countries: [locationCountry.id],
    packages: [packageAffiliation.id],
  },
};

const EMPTY_DB_CASES = [{
  mockEvent: mock,
  expected: {
    body: '{"error":"Invalid dependencies"}',
    statusCode: 422,
  },
}, {
  mockEvent: eventMock,
  expected: {
    body: '',
    statusCode: 500,
  },
}];

const NON_EMPTY_DB_CASES = [{
  mockEvent: mock,
  expected: {
    body: '',
    headers: {
      Location: `/locations/${LOCATION_ID}`,
    },
    statusCode: 201,
  },
}, {
  mockEvent: mock,
  expected: {
    body: '{"error":"Location already exist"}',
    statusCode: 409,
  },
}];

beforeAll(async () => {
  await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  await locationRepository.save(await locationZipcode);
});

afterAll(async () => {
  await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
});

describe('addLocation - ApiGatewayAdaptor', () => {
  describe.each(EMPTY_DB_CASES)('handler - missing dependencies', ({ mockEvent, expected }) => {
    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
    });
  });

  describe.each(NON_EMPTY_DB_CASES)('handler - create and location already exists', ({ mockEvent, expected }) => {
    beforeAll(async () => {
      await packageRepository.save(packageAffiliation);
      await locationRepository.save(locationPackage);
      await locationRepository.save(locationCountry);
    });

    it(`should return ${expected.statusCode} as status code`, async () => {
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
    });
  });

  it('Should find and have same slug / extId', async () => {
    const foundLocation = await locationRepository.findOne('zipcode-id');

    expect(foundLocation?.slug).toEqual(foundLocation?.extId);
  });
});
