import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import Platform from '../../../platform/shared/Platform';
import PlatformMap from '../../../platform/shared/PlatformMap';
import PlatformRepository from '../../../platform/shared/PlatformRepository';
import { PackageType, RevenueModel } from '../../../shared/dto/PackageDto';
import PackageFactory from '../../shared/PackageFactory';
import PackageRepository from '../../shared/PackageRepository';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetPackagesDomain from '../GetPackagesDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-getPackageAdaptor';

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
const platformRepository = new PlatformRepository(
  ddbClient,
  TEST_TABLE_NAME,
  platformMap,
);
const packageFactory = new PackageFactory(uid, platformRepository);
const FIRST_PLATFORM_ID = new UIDGenerator().generate(8);
const firstPlatformDto = {
  extId: 'firetv',
  name: 'FireTV',
  createdAt: '2022-11-10T17:10:000Z',
  updatedAt: '2022-11-10T17:10:000Z',
  enabled: true,
};
const firstPlatformItem = Platform.create(firstPlatformDto, FIRST_PLATFORM_ID);

describe('ApiGatewayAdaptor', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
    await platformRepository.save(firstPlatformItem);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe('success path', () => {
    const packageRepository = new PackageRepository(
      ddbClient,
      TEST_TABLE_NAME,
      packageFactory,
    );
    const domain = new GetPackagesDomain(packageRepository);
    const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

    it('should return a status code 200 with an empty Package array', async () => {
      expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
        body: '{"packages":[]}',
        statusCode: 200,
      });
    });

    it('should return a status code 200 with all packages', async () => {
      const packages = await Promise.all(Array.from(Array(20)
        .keys()).map(async (item, key) => {
          const packageEntity = await packageFactory.toDomain({
            default: false,
            thumbnail: 'packages/packageid/thumbnail.jpg',
            description: 'This is a package',
            extId: `package:${item}`,
            name: `Package #${item}`,
            price: '6.99',
            type: PackageType.EXTERNAL,
            revenueModel: RevenueModel.FREE,
            platforms: [firstPlatformItem.id],
            weight: key,
          });
          await packageRepository.save(packageEntity);
          return packageEntity;
        }));
      expect(await apiGatewayAdaptor.handler(mock)).toMatchObject({
        body: JSON.stringify({ packages }),
        statusCode: 200,
      });
    });
  });

  describe('error path', () => {
    it('should throw an error 500 - Empty table name', async () => {
      const packageRepository = new PackageRepository(
        ddbClient,
        '',
        packageFactory,
      );

      const domain = new GetPackagesDomain(packageRepository);
      const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);

      expect(await apiGatewayAdaptor.handler(mock)).toEqual({ body: '', statusCode: 500 });
    });
  });
});
