import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import EPGTemplateFactory from '../../shared/EPGTemplateFactory';
import eventMock from '../../shared/tests/event-mock';
import EPGTemplateRepository from '../../shared/EPGTemplateRepository';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import DeleteEPGTemplateDomain from '../DeleteEPGTemplateDomain';

import UIDGenerator, { UID } from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-deleteEPGTemplateAdaptor';

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

describe('ApiGatewayAdaptor', () => {
  let epgTemplateFactory: EPGTemplateFactory;
  let epgTemplateRepository: EPGTemplateRepository;
  let domain: DeleteEPGTemplateDomain;
  let apiGatewayAdaptor: ApiGatewayAdaptor;
  let uid: UID;
  let EPG_TEMPLATE_ID: string;

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  beforeEach(() => {
    EPG_TEMPLATE_ID = new UIDGenerator().generate(8);
    uid = {
      generate: () => EPG_TEMPLATE_ID,
    };
    epgTemplateFactory = new EPGTemplateFactory(uid);
    epgTemplateRepository = new EPGTemplateRepository(
      ddbClient,
      TEST_TABLE_NAME,
      epgTemplateFactory,
    );
    domain = new DeleteEPGTemplateDomain(epgTemplateRepository, logTracker);
    apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
  });

  it('should delete an EPG Template given an id', async () => {
    const template = await epgTemplateFactory.toDomain({
      extId: 'json',
      mapping: {
        test: '$.test',
      },
      name: 'JSON template',
      templateType: EpgTemplateType.JSON,
    });
    await epgTemplateRepository.save(template);

    const mock = {
      ...eventMock,
      pathParameters: {
        id: EPG_TEMPLATE_ID,
      },
    };

    expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
      body: '',
      statusCode: 204,
    });
  });

  it('should return a 404 not found given an id', async () => {
    const mock = {
      ...eventMock,
      pathParameters: {
        id: 'non-existent-id',
      },
    };

    expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
      body: '{"error":"EPG Template Not Found"}',
      statusCode: 404,
    });
  });

  it('should check for dependencies', async () => {
    const epgTemplate = await epgTemplateFactory.toDomain({
      extId: 'json',
      mapping: {
        test: '$.test',
      },
      name: 'JSON template',
      templateType: EpgTemplateType.JSON,
    });
    await epgTemplateRepository.save(epgTemplate);
    await epgTemplateRepository.putItem({
      PK: 'CHANNEL#1',
      SK: `ASSET#EPG_TEMPLATE#${EPG_TEMPLATE_ID}`,
      entityType: 'CHANNEL',
      'GSI1-PK': `ASSET#EPG_TEMPLATE#${EPG_TEMPLATE_ID}`,
      'GSI1-SK': 'CHANNEL#1',
    });
    const mock = {
      ...eventMock,
      pathParameters: {
        id: EPG_TEMPLATE_ID,
      },
    };

    expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
      body: '{"error":"Cannot delete an EPG Template with dependencies"}',
      statusCode: 422,
    });
  });

  it('should throw an error 500 - Empty table name', async () => {
    const invalidEpgRepository = new EPGTemplateRepository(
      ddbClient,
      '',
      epgTemplateFactory,
    );
    const nonWorkingDomain = new DeleteEPGTemplateDomain(invalidEpgRepository, logTracker);
    const nonWorkingApiGatewayAdaptor = new ApiGatewayAdaptor(nonWorkingDomain);

    const mock = {
      ...eventMock,
      pathParameters: {
        id: 'non-existent-id',
      },
    };

    expect(await nonWorkingApiGatewayAdaptor.handler(mock)).toEqual({ body: '', statusCode: 500 });
  });
});
