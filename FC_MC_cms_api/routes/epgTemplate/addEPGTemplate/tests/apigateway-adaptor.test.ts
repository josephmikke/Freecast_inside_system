import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import eventMock from '../../../category/shared/tests/event-mock';
import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import EPGTemplateFactory from '../../shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../shared/EPGTemplateRepository';
import AddEPGTemplateDomain from '../AddEPGTemplateDomain';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

const TEST_TABLE_NAME = 'test-addEPGTemplateAdaptor';

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

const mock = {
  ...eventMock,
  body: {
    name: 'JSON',
    extId: 'json-template',
    templateType: EpgTemplateType.JSON,
    mapping: {
      title: '$.title',
      ext_id: '$.ext_id',
      duration: {
        duration: '$.duration',
        duration_format: 'seconds',
      },
      end_time: {
        date: '$.end_time',
        time: '',
        method: 'concat',
        date_format: '',
        time_format: '',
      },
      epgs_list: '$[0]',
      thumbnail: '$.thumbnail',
      start_time: {
        date: '$.start_time',
        time: '',
        method: 'concat',
        date_format: '',
        time_format: '',
      },
      description: '$.description',
      epg_program: '$.epg_programs',
    },
  },
};

describe('addProvider - ApiGatewayAdaptor', () => {
  const EPG_TEMPLATE_ID = new UIDGenerator().generate(8);
  const uid = {
    generate: () => EPG_TEMPLATE_ID,
  };
  const epgTemplateFactory = new EPGTemplateFactory(uid);
  const repository = new EPGTemplateRepository(ddbClient, TEST_TABLE_NAME, epgTemplateFactory);
  const domain = new AddEPGTemplateDomain(repository, epgTemplateFactory, logTracker);
  const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
  const CASES = [{
    mockEvent: mock,
    expected: {
      body: '',
      headers: {
        Location: `/epgTemplates/${EPG_TEMPLATE_ID}`,
      },
      statusCode: 201,
    },
  }, {
    mockEvent: mock,
    expected: {
      body: '{"error":"EPG Template already exist"}',
      statusCode: 409,
    },
  }, {
    mockEvent: eventMock,
    expected: {
      body: '',
      statusCode: 500,
    },
  }];

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
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
