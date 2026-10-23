import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import PackageFactory from '../../../package/shared/PackageFactory';
import PackageRepository from '../../../package/shared/PackageRepository';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { LocationType } from '../../../shared/dto/LocationDto';
import LocationFactory from '../../shared/LocationFactory';
import LocationRepository from '../../shared/LocationRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetLocationsDomain from '../GetLocationsDomain';
import Location from '../../shared/Location';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const TEST_TABLE_NAME = 'test-getLocationAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const mock = {
  ...eventMock,
};

const uid = new UIDGenerator();
const platformMap = new PlatformMap(uid);
const platformRepository = new PlatformRepository(ddbClient, TEST_TABLE_NAME, platformMap);

const packageFactory = new PackageFactory(uid, platformRepository);
const packageRepository = new PackageRepository(ddbClient, TEST_TABLE_NAME, packageFactory);

const locationFactory = new LocationFactory(uid, packageRepository);
const locationRepository = new LocationRepository(
  ddbClient,
  TEST_TABLE_NAME,
  locationFactory,
);
const FIRST_PACKAGE_ID = new UIDGenerator().generate(8);
const firstPackageDto = {
  slug: 'firetv-us',
  extId: 'firetv-us',
  name: 'FireTV-US',
  type: LocationType.CITY,
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};
const firstPackageItem = Location.create(firstPackageDto, FIRST_PACKAGE_ID);

describe('ApiGatewayAdaptor', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe('success path', () => {
    const domain = new GetLocationsDomain(locationRepository);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    it('should return a status code 200 with an empty Location array', async () => {
      expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
        body: '{"locations":[]}',
        statusCode: 200,
      });
    });

    it('should return a status code 200 with all cities', async () => {
      await locationRepository.save(firstPackageItem);
      const locations = await Promise.all(Array.from(Array(20)
        .keys()).map(async (item) => {
        const locationDto = {
          slug: `location:zipcode:${item}`,
          extId: `location:zipcode:${item}`,
          name: `Location zipcode #${item}`,
          type: LocationType.ZIPCODE,
          cities: [firstPackageItem.id],
        };
        const locationEntity = await locationRepository.updateAffiliations(
          await locationFactory.toDomain(locationDto),
          locationDto,
        );
        await locationRepository.save(locationEntity);
        return locationRepository.findOne(locationEntity.id);
      }));
      // Add the first created package
      locations.push(await locationRepository.findOne(firstPackageItem.id));
      // Sort array to match repository response order (by name ASC)
      locations.sort((a, b) => {
        if (a && b) {
          if (a.name < b.name) return -1;
          if (a.name > b.name) return 1;
        }
        return 0;
      });
      expect(await apiGatewayAdaptor.handler(mock)).toMatchObject({
        body: JSON.stringify({ locations }),
        statusCode: 200,
      });
    });
  });

  describe('error path', () => {
    it('should throw an error 500 - Empty table name', async () => {
      const noTableLocationRepository = new LocationRepository(
        ddbClient,
        '',
        locationFactory,
      );

      const domain = new GetLocationsDomain(noTableLocationRepository);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      expect(await apiGatewayAdaptor.handler(mock)).toEqual({ body: '', statusCode: 500 });
    });
  });
});
