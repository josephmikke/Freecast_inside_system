import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import EPGTemplateFactory from '../../shared/EPGTemplateFactory';
import eventMock from '../../shared/tests/event-mock';
import EPGTemplateRepository from '../../shared/EPGTemplateRepository';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetEPGTemplatesDomain from '../GetEPGTemplatesDomain';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-getEPGTemplatesAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

describe('ApiGatewayAdaptor', () => {
  let epgTemplateFactory: EPGTemplateFactory;
  let epgTemplateRepository: EPGTemplateRepository;
  let domain: GetEPGTemplatesDomain;
  let apiGatewayAdaptor: ApiGatewayAdaptor;

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  beforeEach(() => {
    epgTemplateFactory = new EPGTemplateFactory(new UIDGenerator());
    epgTemplateRepository = new EPGTemplateRepository(
      ddbClient,
      TEST_TABLE_NAME,
      epgTemplateFactory,
    );
    domain = new GetEPGTemplatesDomain(epgTemplateRepository);
    apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
  });

  it('should return a status code 200 with an empty EPGTemplate array', async () => {
    expect(await apiGatewayAdaptor.handler(eventMock)).toStrictEqual({
      body: '{"templates":[]}',
      statusCode: 200,
    });
  });

  it('should return a status code 200 with all EPG templates', async () => {
    const templates = await Promise.all(Array.from(Array(10)
      .keys()).map(async (item, key) => {
      const epgTemplate = await epgTemplateFactory.toDomain({
        name: `${key} EPGTemplate`,
        extId: `json-${key}`,
        mapping: {
          title: '$.title',
          ext_id: '$.ext_id',
        },
        templateType: EpgTemplateType.JSON,
      });
      await epgTemplateRepository.save(epgTemplate);
      return epgTemplate;
    }));

    templates.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    const result = await apiGatewayAdaptor.handler(eventMock);
    console.log(result);

    expect(result).toEqual({
      body: JSON.stringify({ templates }),
      statusCode: 200,
    });
  });

  it('should throw an error 500 - Empty table name', async () => {
    const invalidEpgRepository = new EPGTemplateRepository(
      ddbClient,
      '',
      epgTemplateFactory,
    );
    const nonWorkingDomain = new GetEPGTemplatesDomain(invalidEpgRepository);
    const nonWorkingApiGatewayAdaptor = new ApiGatewayAdaptor(nonWorkingDomain);

    expect(await nonWorkingApiGatewayAdaptor.handler(eventMock)).toEqual({ body: '', statusCode: 500 });
  });
});
