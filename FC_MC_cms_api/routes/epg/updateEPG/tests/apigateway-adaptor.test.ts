// eslint-disable-next-line max-classes-per-file
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { S3Client } from '@aws-sdk/client-s3';
import { CreateScheduleCommand, DeleteScheduleCommand, SchedulerClient } from '@aws-sdk/client-scheduler';
import { mockClient } from 'aws-sdk-client-mock';
import { Response } from 'cross-fetch';
import jp from 'jsonpath';

import UIDGenerator, { UID } from '/opt/nodejs/powertools/UIDGenerator';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { MovieRating } from '../../../asset/shared/Rating';
import EPGTemplate from '../../../epgTemplate/shared/EPGTemplate';
import EPGTemplateFactory from '../../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../../epgTemplate/shared/EPGTemplateRepository';
import { EPGTemplateDto, EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import ICDNAdaptor from '../../../shared/interfaces/ICDNAdaptor';
import SchedulerAdaptor from '../../../shared/scheduler/SchedulerAdaptor';
import StorageAdaptor from '../../../shared/StorageAdaptor';
import { ILogTracker } from '../../../shared/tracker/ILogTracker';
import { TrackDto } from '../../../shared/tracker/LogTrackAdaptor';
import CSVParserAdaptor from '../../shared/csv/CSVParserAdaptor';
import CSVToObject from '../../shared/csv/CSVToObject';
import EPG from '../../shared/EPG';
import EPGFactory from '../../shared/EPGFactory';
import EPGProgramBuilder from '../../shared/EPGProgramBuilder';
import EPGRepository from '../../shared/EPGRepository';
import HttpClientAdaptor from '../../shared/HttpClientAdaptor';
import { IHttpClient } from '../../shared/IHttpClient';
import { EPGProgram } from '../../shared/IParser';
import JsonParserAdaptor from '../../shared/json/JSONParserAdaptor';
import eventMock from '../../shared/tests/event-mock';
import TransformerAdaptor from '../../shared/TransformerAdaptor';
import XMLParserAdaptor from '../../shared/xml/XMLParserAdaptor';
import XMLPathAdaptor from '../../shared/xml/XMLPathAdaptor';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import UpdateEPGDomain from '../UpdateEPGDomain';

const TEST_TABLE_NAME = 'test-epgUpdateEPGApiGatewayAdaptor';
const eventBridgeMock = mockClient(SchedulerClient);
const s3Mock = mockClient(S3Client);
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

const uid = new UIDGenerator();
const scheduler = new SchedulerAdaptor(new SchedulerClient({}));

// Serves the CloudFront EPG samples from local copies; under a full parallel run the live
// requests hit socket timeouts. Response comes from cross-fetch, not the jest global one.
const FIXTURE_HOST = 'https://d2d6fj119jntet.cloudfront.net/Jest/';
const FIXTURE_TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.csv': 'text/csv',
  '.xml': 'text/xml',
};
class FixtureHttpClient implements IHttpClient<Response> {
  private readonly realClient = new HttpClientAdaptor();

  async get(url: string): Promise<Response> {
    const fileName = url.startsWith(FIXTURE_HOST) ? url.slice(FIXTURE_HOST.length) : '';
    const contentType = FIXTURE_TYPES[path.extname(fileName)];
    if (contentType) {
      return new Response(readFileSync(path.join(__dirname, 'assets', fileName), 'utf8'), {
        status: 200,
        headers: { 'content-type': contentType },
      });
    }
    return this.realClient.get(url);
  }
}
const httpClient = new FixtureHttpClient();
const transformerAdaptor = new TransformerAdaptor();
const csvToObject = new CSVToObject();
const xmlPath = new XMLPathAdaptor();

const s3Client = new S3Client({});
const storageAdaptor = new StorageAdaptor(s3Client, 'fake-bucket', uid);

class MockCDNAdaptor implements ICDNAdaptor {
  async invalidateCache(paths: string[]): Promise<void> {
    console.log(paths);
  }
}

const EPG_ID = 'unique-epg-id-1875317853765';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const handlerPayloadMock = {
  ...eventMock,
  pathParameters: {
    id: EPG_ID,
  },
};

const CASES = [{
  mockEvent: {
    ...handlerPayloadMock,
    pathParameters: { id: EPG_ID },
    body: {
      name: 'epg-new-name',
    },
  },
  expected: {
    body: '',
    statusCode: 204,
  },
}, {
  mockEvent: {
    ...handlerPayloadMock,
    pathParameters: { id: EPG_ID },
    body: {
      name: 'epg-new-name-2',
      extId: 'abc-kaal-new',
      timezone: 'Europe/Paris',
      epgTemplate: '',
      ingestionSchedule: '1 8 ? 1-12 1-7 *', // Cron schedule
      ingestionUrl: 'https://d2d6fj119jntet.cloudfront.net/Jest/test-epg.json',
      enabled: false,
    },
  },
  expected: {
    body: '',
    statusCode: 204,
  },
  timezone: 'Europe/Paris',
}, {
  mockEvent: {
    ...handlerPayloadMock,
    pathParameters: { id: EPG_ID },
    body: {
      programs: [
        {
          id: 'random-id',
          title: 'Title is changed on existing',
          ext_id: '202639449-unique-epg', // should be unique
          duration: '3600',
          start_time: '2022-11-30T17:01:00Z',
          end_time: '2022-11-30T18:00:00Z',
          thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
          description: 'Live market coverage and analysis.',
          catchup: true,
          slug: 'sc-202639449',
          subtitle: 'Test subtitle',
        },
        {
          id: 'random-id-2',
          title: 'Yahoo! Finance Live',
          ext_id: '202639450000-unique-epg', // should be unique
          duration: '3600',
          start_time: '2022-12-30T17:01:00Z',
          end_time: '2022-12-30T18:00:00Z',
          thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
          description: 'Live market coverage and analysis. EP2',
          catchup: true,
          slug: 'sc-202639450000',
          subtitle: 'ADDED Program from update',
        },
      ],
    },
  },
  expected: {
    body: '',
    statusCode: 204,
  },
}, {
  mockEvent: {
    ...handlerPayloadMock,
    pathParameters: { id: EPG_ID },
    body: {
      ingestionUrl: 'not-existing-url',
    },
  },
  expected: {
    body: '{"error":"Unable to fetch EPG: Error: TypeError: Only absolute URLs are supported"}',
    statusCode: 500,
  },
}, {
  mockEvent: {
    ...handlerPayloadMock,
    pathParameters: { id: 'random' },
    body: {
      name: 'epg-new-name',
    },
  },
  expected: {
    body: '{"error":"EPG Not Found"}',
    statusCode: 404,
  },
}, {
  mockEvent: {
    ...handlerPayloadMock,
    pathParameters: { id: EPG_ID },
    body: {
      extId: 'existing-id',
    },
  },
  expected: {
    body: '{"error":"EPG extId already exists"}',
    statusCode: 409,
  },
},
{
  mockEvent: {
    ...handlerPayloadMock,
    pathParameters: { id: EPG_ID },
    body: {
      epgTemplate: 'not-existing-id',
    },
  },
  expected: {
    body: '{"error":"Invalid dependencies"}',
    statusCode: 422,
  },
}, {
  mockEvent: {
    ...handlerPayloadMock,
    pathParameters: { id: EPG_ID },
    body: {
      ingestionSchedule: 'not-correct',
    },
  },
  expected: {
    body: '{"error":"Invalid Cron expression: Error: Expected 6 values, but got 1. (Input cron: \'not-correct\')"}',
    statusCode: 400,
  },
},
{
  mockEvent: { ...handlerPayloadMock, pathParameters: undefined },
  expected: {
    body: '',
    statusCode: 500,
  },
}];

const specialCases = {

  unableToDeleteSchedule: {
    mockEvent: {
      ...handlerPayloadMock,
      pathParameters: { id: EPG_ID },
      body: {
        ingestionSchedule: '3 8 ? 1-12 1-7 *',
      },
    },
    expected: {
      body: '{"error":"EPG Cannot Be Deleted: Unable to detach schedule rule: Error: Error"}',
      statusCode: 500,
    },
  },
  unableToAttachTargets: {
    mockEvent: {
      ...handlerPayloadMock,
      pathParameters: { id: EPG_ID },
      body: {
        ingestionSchedule: '2 8 ? 1-12 1-7 *',
      },
    },
    expected: {
      body: '{"error":"Ingestion scheduler: Unable to attach target: Error: Error"}',
      statusCode: 500,
    },
  },
  unableToSchedule: {
    mockEvent: {
      ...handlerPayloadMock,
      pathParameters: { id: EPG_ID },
      body: {
        ingestionSchedule: '3 8 ? 1-12 1-7 *',
      },
    },
    expected: {
      body: '{"error":"Ingestion scheduler: Unable to create schedule: Error: Error"}',
      statusCode: 500,
    },
  },
  unableToDeleteFile: {
    mockEvent: {
      ...handlerPayloadMock,
      pathParameters: { id: EPG_ID },
      body: {
        thumbnail: 'data:image/png;base64,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',
      },
    },
    expected: {
      body: '{"error":"Unable to store thumbnail: Error: Error: Error"}',
      statusCode: 422,
    },
  },
};

describe('Update EPG ApiGatewayAdaptor', () => {
  let epg: EPG;
  let epgUidMock: UID;
  let epgTemplateUidMock: UID;
  let epgRepository: EPGRepository;
  let epgTemplate: EPGTemplateDto;
  let epgTemplateAsset: EPGTemplate;
  let epgTemplateUid: string;
  let epgUid: string;
  let epgFactory: EPGFactory;
  let epgTemplateFactory: EPGTemplateFactory;
  let epgTemplateRepository: EPGTemplateRepository;
  let epgProgram: EPGProgram;
  const epgProgramBuilder = new EPGProgramBuilder({
    generate: () => 'random-id',
  });
  let apiGatewayAdaptor: ApiGatewayAdaptor;
  const jsonParser = new JsonParserAdaptor(httpClient, jp, transformerAdaptor, epgProgramBuilder);
  const csvParser = new CSVParserAdaptor(
    httpClient,
    csvToObject,
    transformerAdaptor,
    epgProgramBuilder,
  );
  const xmlParser = new XMLParserAdaptor(
    httpClient,
    xmlPath,
    transformerAdaptor,
    epgProgramBuilder,
  );

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');

    epgTemplateUid = new UIDGenerator().generate(8);
    epgUid = new UIDGenerator().generate(8);
    epgUidMock = {
      generate: () => epgUid,
    };
    epgTemplateUidMock = {
      generate: () => epgTemplateUid,
    };
    epgTemplateFactory = new EPGTemplateFactory(epgTemplateUidMock);
    epgTemplateRepository = new EPGTemplateRepository(
      ddbClient,
      TEST_TABLE_NAME,
      epgTemplateFactory,
    );
    epgTemplate = {
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
        slug: '$.slug',
      },
      name: 'epg-template',
      templateType: EpgTemplateType.JSON,
      extId: 'epg-template-json',
    };

    epgProgram = {
      id: 'random-id',
      title: 'Yahoo! Finance Live',
      ext_id: '202639449-unique-epg', // should be unique
      duration: '3600',
      start_time: '2022-11-30T17:01:00Z',
      end_time: '2022-11-30T18:00:00Z',
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
      alternateThumbnail: null,
      archive: false,
      rating: MovieRating.PG_13,
      description: 'Live market coverage and analysis.',
      catchup: true,
      slug: 'sc-202639449',
      subtitle: 'Test subtitle',
    };

    epgTemplateAsset = await epgTemplateFactory.toDomain(epgTemplate);

    await epgTemplateRepository.save(epgTemplateAsset);

    epgFactory = new EPGFactory(epgUidMock, epgTemplateRepository);
    epg = await epgFactory.toDomain({
      id: EPG_ID,
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplateUid,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: [epgProgram],
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    });
    // @ts-ignore
    CASES[1].mockEvent.body.epgTemplate = epgTemplateUid;
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe.each(CASES)('handler', ({ mockEvent, expected, timezone }) => {
    let randomEpg: EPG;
    beforeAll(async () => {
      epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, epgProgramBuilder);

      await epgRepository.save(epg);
      randomEpg = await epgFactory.toDomain({
        id: 'new-random-id',
        name: 'ABC (KAAL) EPG',
        extId: 'existing-id',
        thumbnail: 'epg/epgid/thumbnail.png',
        timezone: 'UTC',
        epgTemplate: epgTemplateUid,
        ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
        programs: [epgProgram],
        ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
      });
      await epgRepository.save(randomEpg);
      apiGatewayAdaptor = new ApiGatewayAdaptor(new UpdateEPGDomain(
        epgRepository,
        epgTemplateRepository,
        {
          csv: csvParser,
          json: jsonParser,
          xml: xmlParser,
        },
        epgFactory,
        scheduler,
        'arn:lambda',
        'arn:iam',
        storageAdaptor,
        new MockCDNAdaptor(),
        logTracker,
      ));
    });
    afterAll(async () => {
      await epgRepository.remove(epg);
      await epgRepository.remove(randomEpg);
    });

    it(`should return ${expected.statusCode} as status code`, async () => {
      eventBridgeMock.onAnyCommand().resolves({});
      s3Mock.onAnyCommand().resolves({});
      console.log(mockEvent.body);
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
      const result = await epgRepository.findOne(epg.id);
      if (timezone) expect(result?.timezone).toEqual('Europe/Paris');
    });
  });

  describe('handler - aws errors', () => {
    beforeAll(async () => {
      epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, epgProgramBuilder);

      await epgRepository.save(epg);
    });
    afterAll(async () => {
      await epgRepository.remove(epg);
    });

    beforeEach(async () => {
      await eventBridgeMock.reset();
      await s3Mock.reset();
    });

    it('aws s3 replace file error', async () => {
      eventBridgeMock.onAnyCommand().resolves({});
      s3Mock.onAnyCommand().rejects({});
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(specialCases.unableToDeleteFile.mockEvent))
        .toStrictEqual(specialCases.unableToDeleteFile.expected);
    });

    it('aws eventBridge delete schedule rule', async () => {
      eventBridgeMock.on(DeleteScheduleCommand).rejects({});
      s3Mock.onAnyCommand().resolves({});
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(specialCases.unableToDeleteSchedule.mockEvent))
        .toStrictEqual(specialCases.unableToDeleteSchedule.expected);
    });

    it('aws eventBridge add schedule rule', async () => {
      eventBridgeMock.on(DeleteScheduleCommand).resolves({});
      eventBridgeMock.on(CreateScheduleCommand).rejects({});
      s3Mock.onAnyCommand().resolves({});
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(specialCases.unableToSchedule.mockEvent))
        .toStrictEqual(specialCases.unableToSchedule.expected);
    });
  });

  describe('parseEPG with other epgTemplates', () => {
    const csvTemplateUid = new UIDGenerator().generate(8);
    const xmlTemplateUid = new UIDGenerator().generate(8);
    beforeAll(async () => {
      const validCSVMappingTemplate = {
        mapping: {
          title: 'Title',
          ext_id: 'SeriesId',
          start_time: {
            date: 'StartTime',
            date_format: '%d/%m/%Y %H:%M',
            time: '',
            time_format: '',
            method: 'concat',
          },
          end_time: {
            date: 'EndTime',
            date_format: '%d/%m/%Y %H:%M',
            time: '',
            time_format: '',
            method: 'concat',
          },
          duration: {
            duration: 'Duration',
            duration_format: 'minutes',
          },
          thumbnail: 'Image',
          description: 'Description',
        },
        name: 'epg-template',
        templateType: EpgTemplateType.CSV,
        extId: 'epg-template-csv',
      };

      const validXMLMappingTemplate = {
        extId: 'epg-template',
        mapping: {
          epg_program: '//Programs/Program',
          title: '@ProgramTitle',
          ext_id: '@SeriesId',
          start_time: {
            date: 'Schedules/Schedule/@CalendarDT',
            date_format: '',
            time: '',
            time_format: '',
            method: 'concat',
          },
          end_time: {
            date: '',
            date_format: '',
            time: '',
            time_format: '',
            method: '',
          },
          duration: {
            duration: 'Schedules/Schedule/@Duration',
            duration_format: 'minutes',
          },
          thumbnail: 'RichMedia/Images/Image/@FileLocation',
          description: 'PgmDescriptions/PgmDescription/Description',
        },
        name: 'epg-template',
        templateType: EpgTemplateType.XML,
      };

      const csvMockUid: UID = {
        generate: () => csvTemplateUid,
      };
      epgTemplateFactory = new EPGTemplateFactory(csvMockUid);
      epgTemplateRepository = new EPGTemplateRepository(
        ddbClient,
        TEST_TABLE_NAME,
        epgTemplateFactory,
      );

      const csvTemplate = await epgTemplateFactory.toDomain(validCSVMappingTemplate);
      await epgTemplateRepository.save(csvTemplate);

      const xmlMockUid: UID = {
        generate: () => xmlTemplateUid,
      };
      epgTemplateFactory = new EPGTemplateFactory(xmlMockUid);
      epgTemplateRepository = new EPGTemplateRepository(
        ddbClient,
        TEST_TABLE_NAME,
        epgTemplateFactory,
      );

      const xmlTemplate = await epgTemplateFactory.toDomain(validXMLMappingTemplate);
      await epgTemplateRepository.save(xmlTemplate);

      await epgRepository.save(epg);
    });
    afterAll(async () => {
      await epgRepository.remove(epg);
    });
    beforeEach(async () => {
      eventBridgeMock.reset();
      s3Mock.reset();
    });

    it('should work with a valid CSV parser', async () => {
      const csvCase = {
        mockEvent: {
          ...handlerPayloadMock,
          pathParameters: { id: EPG_ID },
          body: {
            epgTemplate: csvTemplateUid,
            ingestionUrl: 'https://d2d6fj119jntet.cloudfront.net/Jest/test-epg.csv',
          },
        },
        expected: {
          body: '',
          statusCode: 204,
        },
      };

      eventBridgeMock.onAnyCommand().resolves({});
      s3Mock.onAnyCommand().resolves({});
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(csvCase.mockEvent)).toStrictEqual(csvCase.expected);
    });

    it('should work with a valid XML parser', async () => {
      const xmlCase = {
        mockEvent: {
          ...handlerPayloadMock,
          pathParameters: { id: EPG_ID },
          body: {
            epgTemplate: xmlTemplateUid,
            ingestionUrl: 'https://d2d6fj119jntet.cloudfront.net/Jest/test-epg-small.xml',
          },
        },
        expected: {
          body: '',
          statusCode: 204,
        },
      };

      eventBridgeMock.onAnyCommand().resolves({});
      s3Mock.onAnyCommand().resolves({});
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(xmlCase.mockEvent)).toStrictEqual(xmlCase.expected);
    });

    it('should have its first attached program', async () => {
      const fetchedEpg = await epgRepository.findOne(EPG_ID, { filter: {}, ignore: true });

      expect(fetchedEpg?.programs.find((epgProg) => epgProg.ext_id === '202639449-unique-epg')).toEqual(epgProgram);
    });
  });
});
