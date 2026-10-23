import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import EPGTemplate from '../../shared/EPGTemplate';
import EPGTemplateFactory from '../../shared/EPGTemplateFactory';
import eventMock from '../../shared/tests/event-mock';
import EPGTemplateRepository from '../../shared/EPGTemplateRepository';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import UpdateEPGTemplateDomain from '../UpdateEPGTemplateDomain';

import UIDGenerator, { UID } from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-updateEPGTemplateAdaptor';

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
  let domain: UpdateEPGTemplateDomain;
  let apiGatewayAdaptor: ApiGatewayAdaptor;
  let uid: UID;
  let EPG_TEMPLATE_ID: string;
  let template: EPGTemplate;

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
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
    domain = new UpdateEPGTemplateDomain(epgTemplateRepository, epgTemplateFactory, logTracker);
    apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
    const secondEPGTemplate = await epgTemplateFactory.toDomain({
      extId: 'csv',
      mapping: {
        test: '$.test',
      },
      name: 'CSV template',
      templateType: EpgTemplateType.CSV,
      id: '42',
    });
    await epgTemplateRepository.save(secondEPGTemplate);
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  beforeEach(async () => {
    template = await epgTemplateFactory.toDomain({
      extId: 'json',
      mapping: {
        test: '$.test',
      },
      name: 'JSON template',
      templateType: EpgTemplateType.JSON,
    });
    await epgTemplateRepository.save(template);
  });

  afterEach(async () => {
    await epgTemplateRepository.remove(template);
  });

  it('should update an EPG Template given new props and an id', async () => {
    const mock = {
      ...eventMock,
      body: {
        extId: 'new-extId',
        enabled: false,
        mapping: {
          test: '$.updated',
        },
        name: 'JSON template - updated',
      },
      pathParameters: {
        id: EPG_TEMPLATE_ID,
      },
    };

    expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
      body: '',
      headers: {
        Location: `/epgTemplates/${EPG_TEMPLATE_ID}`,
      },
      statusCode: 204,
    });
  });

  it('should return a 404 not found given an id', async () => {
    const mock = {
      ...eventMock,
      body: {
        name: 'new name',
      },
      pathParameters: {
        id: 'non-existent-id',
      },
    };

    expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
      body: '{"error":"EPG Template Not Found"}',
      statusCode: 404,
    });
  });

  it('should throw an EPGTemplateAlreadyExists error', async () => {
    const mock = {
      ...eventMock,
      body: {
        extId: 'csv',
        mapping: {
          test: '$.updated',
        },
        name: 'JSON template - updated',
      },
      pathParameters: {
        id: EPG_TEMPLATE_ID,
      },
    };

    expect(await apiGatewayAdaptor.handler(mock)).toStrictEqual({
      body: '{"error":"EPG Template Already Exist"}',
      statusCode: 409,
    });
  });

  it('should throw an error 500 - Empty table name', async () => {
    const invalidEpgRepository = new EPGTemplateRepository(
      ddbClient,
      '',
      epgTemplateFactory,
    );
    const nonWorkingDomain = new UpdateEPGTemplateDomain(invalidEpgRepository, epgTemplateFactory, logTracker);
    const nonWorkingApiGatewayAdaptor = new ApiGatewayAdaptor(nonWorkingDomain);

    const mock = {
      ...eventMock,
      body: {},
      pathParameters: {
        id: 'non-existent-id',
      },
    };

    expect(await nonWorkingApiGatewayAdaptor.handler(mock)).toEqual({ body: '', statusCode: 500 });
  });
});
