import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { mockClient } from 'aws-sdk-client-mock';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { MovieRating } from '../../../asset/shared/Rating';
import EPGTemplate from '../../../epgTemplate/shared/EPGTemplate';
import EPGTemplateFactory from '../../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../../epgTemplate/shared/EPGTemplateRepository';
import { EPGTemplateDto, EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';

import UIDGenerator, { UID } from '/opt/nodejs/powertools/UIDGenerator';

import EPG from '../../shared/EPG';
import EPGFactory from '../../shared/EPGFactory';
import EPGProgramBuilder from '../../shared/EPGProgramBuilder';
import EPGRepository from '../../shared/EPGRepository';
import { EPGProgram } from '../../shared/IParser';
import LambdaAdaptor from '../../shared/lambda/LambdaAdaptor';
import eventMock from '../../shared/tests/event-mock';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import IngestEPGDomain from '../IngestEPGDomain';

const TEST_TABLE_NAME = 'test-epgIngestEPGApiGatewayAdaptor';
const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const EPG_ID = 'unique-epg-id-1875317';

const lambdaMock = mockClient(LambdaClient);

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
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: EPG_ID } },
  expected: {
    body: '',
    statusCode: 204,
  },
}, {
  mockEvent: { ...handlerPayloadMock, pathParameters: { id: 'random' } },
  expected: {
    body: '{"error":"EPG Not Found"}',
    statusCode: 404,
  },
},
{
  mockEvent: { ...handlerPayloadMock, pathParameters: undefined },
  expected: {
    body: '',
    statusCode: 500,
  },
}];

describe('Get EPG ApiGatewayAdaptor', () => {
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
      extId: 'json-template',
      mapping: {
        title: '$.title',
        ext_id: '$.ext_id',
      },
      name: 'JSON Template',
      templateType: EpgTemplateType.JSON,
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
      rating: MovieRating.NOT_RATED,
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
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe.each(CASES)('handler', ({ mockEvent, expected }) => {
    beforeAll(async () => {
      epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, epgProgramBuilder);

      await epgRepository.save(epg);
      apiGatewayAdaptor = new ApiGatewayAdaptor(new IngestEPGDomain(
        epgRepository,
        new LambdaAdaptor(new LambdaClient({})),
        process.env.SCHEDULER_ARN!,
      ));
    });
    afterAll(async () => {
      await epgRepository.remove(epg);
    });
    beforeEach(() => {
      lambdaMock.reset();
    });

    it(`should return ${expected.statusCode} as status code`, async () => {
      lambdaMock.onAnyCommand().resolves({
        // @ts-ignore
        Payload: Buffer.from(JSON.stringify({
          statusCode: 200,
          body: '',
        })),
      });
      // @ts-ignore
      expect(await apiGatewayAdaptor.handler(mockEvent)).toStrictEqual(expected);
    });
  });

  describe('handle aws errors', () => {
    beforeAll(async () => {
      await epgRepository.save(epg);
    });
    afterAll(async () => {
      await epgRepository.remove(epg);
    });
    beforeEach(() => {
      lambdaMock.reset();
    });

    it('InvokeCommand - error', async () => {
      lambdaMock.on(InvokeCommand).rejects();

      // @ts-ignore
      expect(await apiGatewayAdaptor
        .handler({ ...handlerPayloadMock, pathParameters: { id: EPG_ID } }))
        .toStrictEqual({
          body: '{"error":"Error: Unable to run ingestion target: Error: Error"}',
          statusCode: 500,
        });
    });
  });
});
