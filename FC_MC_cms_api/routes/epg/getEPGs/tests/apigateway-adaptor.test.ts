import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import EPGProgramBuilder from '../../shared/EPGProgramBuilder';

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import EPGTemplateFactory from '../../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../../epgTemplate/shared/EPGTemplateRepository';
import EPGFactory from '../../shared/EPGFactory';
import EPGRepository from '../../shared/EPGRepository';
import ApiGatewayAdaptor from '../ApiGatewayAdaptor';
import GetEPGsDomain from '../GetEPGsDomain';

import eventMock from './event-mock';

import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { MovieRating } from '../../../asset/shared/Rating';

const TEST_TABLE_NAME = 'test-getEPGsAdaptor';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

describe('API Gateway Adaptor - Get EPGs', () => {
  const uidGenerator = new UIDGenerator();
  const epgId = uidGenerator.generate(8);
  const programId = uidGenerator.generate(8);
  const programUid = {
    generate: () => programId,
  };
  const uid = {
    generate: () => epgId,
  };
  const epgBuilder = new EPGProgramBuilder(programUid);
  const epgTemplateFactory = new EPGTemplateFactory(uid);
  const epgTemplateRepository = new EPGTemplateRepository(
    ddbClient,
    TEST_TABLE_NAME,
    epgTemplateFactory,
  );
  const epgFactory = new EPGFactory(uid, epgTemplateRepository);
  const epgRepository = new EPGRepository(
    ddbClient,
    TEST_TABLE_NAME,
    epgFactory,
    epgBuilder,
  );
  const domain = new GetEPGsDomain(epgRepository);
  const apiGatewayAdaptor = new ApiGatewayAdaptor(domain);
  const validJSONMappingTemplate = {
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

  beforeEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterEach(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('should return all EPGs', async () => {
    const epgTemplate = await epgTemplateFactory.toDomain(validJSONMappingTemplate);
    await epgTemplateRepository.save(epgTemplate);

    const epgPrograms = Array.from(Array(1)
      .keys()).map((key) => ({
      id: 'random-id',
      title: 'Yahoo! Finance Live',
      ext_id: `202639449${key}`, // should be unique
      duration: '3600',
      start_time: `2022-11-30T1${key}:01:00Z`,
      end_time: `2022-11-30T1${key + 1}:00:00Z`,
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
      alternateThumbnail: null,
      archive: false,
      rating: MovieRating.NOT_RATED,
      description: 'Live market coverage and analysis.',
      catchup: true,
      slug: 'sc-202639449',
      subtitle: 'Test subtitle',
    }));

    const epg = await epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplate.id,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: epgPrograms,
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    });
    await epgRepository.save(epg);

    const mock = {
      ...eventMock,
    };
    const { body, statusCode } = await apiGatewayAdaptor.handler(mock);
    expect(statusCode).toEqual(200);
    expect(JSON.parse(body)).toEqual({
      epgs: [
        {
          id: epgId,
          extId: 'abc-kaal',
          createdAt: '2022-10-17T00:00:00.000Z',
          updatedAt: '2022-10-17T00:00:00.000Z',
          enabled: true,
          name: 'ABC (KAAL) EPG',
          epgTemplate: {
            id: epgId,
            extId: 'epg-template-json',
            createdAt: '2022-10-17T00:00:00.000Z',
            updatedAt: '2022-10-17T00:00:00.000Z',
            enabled: true,
            name: 'epg-template',
            mapping: {
              duration: {
                duration: '$.duration',
                duration_format: 'seconds',
              },
              start_time: {
                date: '$.start_time',
                date_format: null,
                time: null,
                time_format: null,
                method: 'concat',
              },
              thumbnail: '$.thumbnail',
              epg_program: '$.epg_programs',
              ext_id: '$.ext_id',
              end_time: {
                date: '$.end_time',
                date_format: null,
                time: null,
                time_format: null,
                method: 'concat',
              },
              epgs_list: '$[0]',
              description: '$.description',
              title: '$.title',
              slug: '$.slug',
            },
            templateType: 'JSON',
          },
          programs: [],
          ingestionSchedule: '0 8 ? 1-12 1-7 *',
          timezone: 'UTC',
          thumbnail: `${process.env.ASSETS_URL}/epg/epgid/thumbnail.png`,
          ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
        },
      ],
    });
  });

  it('should return all EPGs', async () => {
    const epgTemplate = await epgTemplateFactory.toDomain(validJSONMappingTemplate);
    await epgTemplateRepository.save(epgTemplate);

    const epgPrograms = Array.from(Array(1)
      .keys()).map((key) => ({
      id: 'random-id',
      title: 'Yahoo! Finance Live',
      ext_id: `202639449${key}`, // should be unique
      duration: '3600',
      start_time: `2022-11-30T1${key}:01:00Z`,
      end_time: `2022-11-30T1${key + 1}:00:00Z`,
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
      alternateThumbnail: null,
      archive: false,
      rating: MovieRating.NOT_RATED,
      description: 'Live market coverage and analysis.',
      catchup: true,
      slug: 'sc-202639449',
      subtitle: 'Test subtitle',
    }));

    const epg = await epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplate.id,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: epgPrograms,
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    });
    await epgRepository.save(epg);

    const mock = {
      ...eventMock,
    };
    const { body, statusCode } = await apiGatewayAdaptor.handler({
      ...mock,
      queryStringParameters: {
        startTime: '2022',
        endTime: '2022-12',
      },
    });
    expect(statusCode).toEqual(200);
    expect(JSON.parse(body)).toEqual({
      epgs: [
        {
          id: epgId,
          extId: 'abc-kaal',
          createdAt: '2022-10-17T00:00:00.000Z',
          updatedAt: '2022-10-17T00:00:00.000Z',
          enabled: true,
          name: 'ABC (KAAL) EPG',
          epgTemplate: {
            id: epgId,
            extId: 'epg-template-json',
            createdAt: '2022-10-17T00:00:00.000Z',
            updatedAt: '2022-10-17T00:00:00.000Z',
            enabled: true,
            name: 'epg-template',
            mapping: {
              duration: {
                duration: '$.duration',
                duration_format: 'seconds',
              },
              start_time: {
                date: '$.start_time',
                date_format: null,
                time: null,
                time_format: null,
                method: 'concat',
              },
              thumbnail: '$.thumbnail',
              epg_program: '$.epg_programs',
              ext_id: '$.ext_id',
              end_time: {
                date: '$.end_time',
                date_format: null,
                time: null,
                time_format: null,
                method: 'concat',
              },
              epgs_list: '$[0]',
              description: '$.description',
              title: '$.title',
              slug: '$.slug',
            },
            templateType: 'JSON',
          },
          programs: [{
            alternateThumbnail: null,
            archive: false,
            id: 'random-id',
            rating: MovieRating.NOT_RATED,
            subtitle: 'Test subtitle',
            thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
            catchup: true,
            description: 'Live market coverage and analysis.',
            duration: '3600',
            end_time: '2022-11-30T11:00:00Z',
            ext_id: '2026394490',
            slug: 'sc-202639449',
            start_time: '2022-11-30T10:01:00Z',
            title: 'Yahoo! Finance Live',
          }],
          ingestionSchedule: '0 8 ? 1-12 1-7 *',
          timezone: 'UTC',
          thumbnail: `${process.env.ASSETS_URL}/epg/epgid/thumbnail.png`,
          ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
        },
      ],
    });
  });
});
