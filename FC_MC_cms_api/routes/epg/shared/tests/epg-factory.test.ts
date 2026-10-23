import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { MovieRating } from '../../../asset/shared/Rating';
import EPGTemplateFactory from '../../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../../epgTemplate/shared/EPGTemplateRepository';
import { EPGTemplateDto, EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import { CronTaskError } from '../../../shared/valueObjects/CronTask';
import EPG from '../EPG';
import { EPGError } from '../EPGError';
import EPGFactory from '../EPGFactory';

import UIDGenerator, { UID } from '/opt/nodejs/powertools/UIDGenerator';

import { EPGProgram } from '../IParser';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
});

const TABLE_NAME = 'test-epgFactory';

const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

describe('EPG Factory', () => {
  let epg: EPG;
  let epgUidMock: UID;
  let epgTemplateUidMock: UID;
  let epgTemplate: EPGTemplateDto;
  let epgTemplateUid: string;
  let epgUid: string;
  let epgFactory: EPGFactory;
  let epgTemplateFactory: EPGTemplateFactory;
  let epgTemplateRepository: EPGTemplateRepository;
  let epgPrograms: EPGProgram[];

  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TABLE_NAME, 'drop');
  });

  beforeEach(async () => {
    epgTemplateUid = new UIDGenerator().generate(8);
    epgUid = new UIDGenerator().generate(8);
    epgUidMock = {
      generate: () => epgUid,
    };
    epgTemplateUidMock = {
      generate: () => epgTemplateUid,
    };
    epgTemplateFactory = new EPGTemplateFactory(epgTemplateUidMock);
    epgTemplateRepository = new EPGTemplateRepository(ddbClient, TABLE_NAME, epgTemplateFactory);
    epgTemplate = {
      extId: 'json-template',
      mapping: {
        title: '$.title',
        ext_id: '$.ext_id',
      },
      name: 'JSON Template',
      templateType: EpgTemplateType.JSON,
      enabled: true,
    };
    await epgTemplateRepository.save(await epgTemplateFactory.toDomain(epgTemplate));
    epgFactory = new EPGFactory(epgUidMock, epgTemplateRepository);
    epgPrograms = Array.from(Array(4)
      .keys()).map((key) => ({
      id: 'random-id',
      title: `Yahoo! Finance Live ${key}`,
      ext_id: '202639449',
      duration: '3600',
      start_time: '2022-11-30T13:59:59Z',
      end_time: '2022-11-30T14:59:59Z',
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
      alternateThumbnail: null,
      archive: false,
      rating: MovieRating.NOT_RATED,
      description: 'Live market coverage and analysis.',
      catchup: true,
      slug: 'sc-202639449',
      subtitle: 'Test subtitle',
    }));
  });

  it('should create a EPG and attach an EPG template and programs', async () => {
    epg = await epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplateUid,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: epgPrograms,
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    });

    expect(epg.epgTemplate).toEqual({
      ...epgTemplate,
      id: epgTemplateUid,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
    });

    expect(epg.programs).toHaveLength(4);
    expect(epg.programs).toEqual(epgPrograms);
  });

  it('should throw an invalid cron task format exception', async () => {
    const epgDto = {
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplateUid,
      ingestionSchedule: '0 8 1-12 0-6', // Invalid cron schedule
      programs: epgPrograms,
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    };

    await expect(async () => epgFactory.toDomain(epgDto))
      .rejects.toThrow(CronTaskError.InvalidCronTaskExpression);
  });

  it('should create a EPG and add programs', async () => {
    epg = await epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplateUid,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // At 08:00 on every day-of-week from Sunday through Saturday in every month from January through December.
      programs: epgPrograms,
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    });

    expect(epg.epgTemplate).toEqual({
      ...epgTemplate,
      id: epgTemplateUid,
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
    });
  });

  it('should serialize an EPG for persistence', async () => {
    epg = await epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplateUid,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: epgPrograms,
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    });
    const serializedEpg = await epgFactory.toPersistence(epg);

    expect(serializedEpg).toEqual({
      createdAt: '2022-10-17T00:00:00.000Z',
      epgTemplate: epgTemplateUid,
      extId: 'abc-kaal',
      id: epgUid,
      ingestionSchedule: '0 8 ? 1-12 1-7 *',
      name: 'ABC (KAAL) EPG',
      thumbnail: 'epg/epgid/thumbnail.png',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      timezone: 'UTC',
      programs: epgPrograms,
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    });

    expect(serializedEpg.programs).toHaveLength(4);
  });

  it('should throw an EPGTemplateNotFound exception', async () => {
    await expect(async () => epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: 'invalid-id',
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: epgPrograms,
      ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
    })).rejects.toThrow(EPGError.UnknownEPGDependency);
  });
});
