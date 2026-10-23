import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { MovieRating } from '../../../asset/shared/Rating';
import EPGTemplate from '../../../epgTemplate/shared/EPGTemplate';
import EPGTemplateFactory from '../../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../../epgTemplate/shared/EPGTemplateRepository';
import { EPGTemplateDto, EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import EPG from '../EPG';

import UIDGenerator, { UID } from '/opt/nodejs/powertools/UIDGenerator';

import EPGFactory from '../EPGFactory';
import EPGProgramBuilder from '../EPGProgramBuilder';
import EPGRepository from '../EPGRepository';
import { EPGProgram } from '../IParser';

const TEST_TABLE_NAME = 'test-epgRepository';
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

describe('EPG Repository', () => {
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
  let epgPrograms: EPGProgram[];
  const epgProgramBuilder = new EPGProgramBuilder({
    generate: () => 'random-id',
  });

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
    epgPrograms = Array.from(Array(4)
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
      rating: MovieRating.NC_17,
      description: 'Live market coverage and analysis.',
      catchup: true,
      slug: 'sc-202639449',
      subtitle: 'Test subtitle',
    }));

    epgTemplateAsset = await epgTemplateFactory.toDomain(epgTemplate);

    await epgTemplateRepository.save(epgTemplateAsset);

    epgFactory = new EPGFactory(epgUidMock, epgTemplateRepository);
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
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  describe('Save an EPG Entity', () => {
    afterAll(async () => {
      await epgRepository.remove(epg);
    });

    it('should save an epg', async () => {
      epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, epgProgramBuilder);

      expect(await epgRepository.save(epg)).toBeTruthy();
    });

    it('should have a correctly formatted EPG Document', async () => {
      const { Item } = await epgRepository.getItem({
        PK: `ASSET#${EPGRepository.RootEntityType}#${epgUid}`,
        SK: `ASSET#${EPGRepository.RootEntityType}#${epgUid}`,
      });

      expect(Item).toEqual({
        'GSI1-PK': `ASSET#${EPGRepository.RootEntityType}`,
        'GSI1-SK': 'ABC (KAAL) EPG',
        PK: `ASSET#${EPGRepository.RootEntityType}#${epgUid}`,
        SK: `ASSET#${EPGRepository.RootEntityType}#${epgUid}`,
        createdAt: '2022-10-17T00:00:00.000Z',
        enabled: true,
        entityType: 'EPG',
        epgTemplate: epgTemplateUid,
        extId: 'abc-kaal',
        id: epgUid,
        ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
        ingestionSchedule: '0 8 ? 1-12 1-7 *',
        name: 'ABC (KAAL) EPG',
        searchExtId: 'abc-kaal',
        searchName: 'abc (kaal) epg',
        thumbnail: 'epg/epgid/thumbnail.png',
        updatedAt: '2022-10-17T00:00:00.000Z',
        timezone: 'UTC',
      });
    });

    it('should have related epg template saved', async () => {
      const { Item } = await epgRepository.getItem({
        PK: `ASSET#${EPGRepository.RootEntityType}#${epgUid}`,
        SK: `ASSET#${EPGRepository.EpgTemplateEntityType}#${epgTemplateUid}`,
      });

      expect(Item).toEqual({
        id: epgTemplateUid,
        entityType: EPGRepository.EpgTemplateEntityType,
        PK: `ASSET#${EPGRepository.RootEntityType}#${epgUid}`,
        SK: `ASSET#${EPGRepository.EpgTemplateEntityType}#${epgTemplateUid}`,
        'GSI1-PK': `ASSET#${EPGRepository.EpgTemplateEntityType}#${epgTemplateUid}`,
        'GSI1-SK': `ASSET#${EPGRepository.RootEntityType}#${epgUid}`,
      });
    });

    it('should have related programs saved', async () => {
      const { Items } = await epgRepository.query({
        KeyConditionExpression: 'PK = :PK AND begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${EPGRepository.RootEntityType}#${epgUid}`,
          ':SK': `ASSET#${EPGRepository.ChildEntityType}`,
        },
      });

      expect(Items).toEqual(epgPrograms.map((program) => ({
        PK: `ASSET#${EPGRepository.RootEntityType}#${epgUid}`,
        SK: `ASSET#${EPGRepository.ChildEntityType}#${program.start_time}`,
        entityType: EPGRepository.ChildEntityType,
        searchName: program.title.toLowerCase(),
        ...program,
      })));
    });
  });

  describe('Other method', () => {
    afterEach(async () => {
      await epgRepository.remove(epg);
    });

    it('should findOne epg with all relationships built', async () => {
      epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, epgProgramBuilder);
      await epgRepository.save(epg);

      const item = await epgRepository.findOne(epg.id, { filter: {}, ignore: true });
      expect(item).toEqual(epg);
      expect(item?.programs).toEqual(epgPrograms);
      expect(item?.epgTemplate).toEqual(epgTemplateAsset);
    });

    it('should findOne and return undefined', async () => {
      expect(await epgRepository.findOne('non-existing epg')).toBeUndefined();
    });

    it('should check if an epg already exists', async () => {
      epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, epgProgramBuilder);
      await epgRepository.save(epg);

      expect(await epgRepository.exists(epg)).toBeTruthy();
      expect(await epgRepository.exists(Object.assign({}, epg, { extId: 'random' }))).toBeFalsy();
    });

    it('should find all EPG with empty programs', async () => {
      epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, epgProgramBuilder);
      const epgs = await Promise.all(Array.from(Array(2).keys())
        .map(async (key) => {
          const item = await epgFactory.toDomain({
            id: new UIDGenerator().generate(8),
            name: `ABC (KAAL) EPG ${key}`,
            extId: 'abc-kaal',
            thumbnail: 'epg/epgid/thumbnail.png',
            timezone: 'UTC',
            epgTemplate: epgTemplateUid,
            ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
            programs: [],
            ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
          });
          await epgRepository.save(item);
          return item;
        }));
      const item = await epgRepository.findAll();
      expect(item).toHaveLength(2);
      expect(item).toEqual(epgs);
      await Promise.all(epgs.map(async (epgItem) => epgRepository.remove(epgItem)));
    });

    it('should find all EPG', async () => {
      epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, epgProgramBuilder);
      const epgs = await Promise.all(Array.from(Array(5).keys())
        .map(async (key) => {
          const item = await epgFactory.toDomain({
            id: new UIDGenerator().generate(8),
            name: `ABC (KAAL) EPG ${key}`,
            extId: 'abc-kaal',
            thumbnail: 'epg/epgid/thumbnail.png',
            timezone: 'UTC',
            epgTemplate: epgTemplateUid,
            ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
            programs: epgPrograms,
            ingestionUrl: 'https://epg-prod.selecttv.wurl.com/selecttv_bec_witz_1_us_cf.json',
          });
          await epgRepository.save(item);
          return item;
        }));
      const item = await epgRepository.findAll({ filter: {}, ignore: true });
      expect(item).toHaveLength(5);
      expect(item).toEqual(epgs);
    });

    it('should remove an epg with all attached entities', async () => {
      epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, epgProgramBuilder);
      await epgRepository.save(epg);

      expect(await epgRepository.remove(epg)).toBeTruthy();
      const { Items } = await epgRepository.query({
        KeyConditionExpression: 'PK = :PK and begins_with(SK, :SK)',
        ExpressionAttributeValues: {
          ':PK': `ASSET#${EPGRepository.RootEntityType}#${epg.id}`,
          ':SK': 'ASSET#',
        },
      });
      expect(Items).toEqual([]);
    });

    it('should check for relationships', async () => {
      epgRepository = new EPGRepository(ddbClient, TEST_TABLE_NAME, epgFactory, epgProgramBuilder);
      await epgRepository.save(epg);
      const channel = {
        PK: 'C#1',
        SK: `ASSET#${EPGRepository.RootEntityType}#${epg.id}`,
        entityType: 'CHANNEL',
        'GSI1-PK': `ASSET#${EPGRepository.RootEntityType}#${epg.id}`,
        'GSI1-SK': 'C#1',
      };

      expect(await epgRepository.hasRelationships(epg)).toBeFalsy();
      await epgRepository.putItem(channel);
      expect(await epgRepository.hasRelationships(epg)).toBeTruthy();
    });
  });

  describe.each([
    (payload: EPG) => epgRepository.remove(payload),
    (payload: EPG) => epgRepository.save(payload),
    (payload: EPG) => epgRepository.exists(payload),
    (payload: EPG) => epgRepository.hasRelationships(payload),
    (id: string) => epgRepository.findOne(id),
    () => epgRepository.findAll(),
  ])('Exceptions', (func) => {
    // Don't create table to force Exception

    beforeAll(() => {
      epgRepository = new EPGRepository(ddbClient, 'fake-table', epgFactory, epgProgramBuilder);
    });

    it(`${func} should throw an error`, async () => {
      // @ts-ignore
      await expect(async () => func()).rejects.toThrow();
    });
  });
});
