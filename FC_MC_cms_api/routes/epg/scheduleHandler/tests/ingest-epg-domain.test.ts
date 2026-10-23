import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import jp from 'jsonpath';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import EPGTemplateFactory from '../../../epgTemplate/shared/EPGTemplateFactory';
import EPGTemplateRepository from '../../../epgTemplate/shared/EPGTemplateRepository';
import { EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import CSVParserAdaptor from '../../shared/csv/CSVParserAdaptor';
import CSVToObject from '../../shared/csv/CSVToObject';
import { EPGError } from '../../shared/EPGError';
import EPGFactory from '../../shared/EPGFactory';
import EPGProgramBuilder from '../../shared/EPGProgramBuilder';
import EPGRepository from '../../shared/EPGRepository';
import HttpClientAdaptor from '../../shared/HttpClientAdaptor';
import JsonParserAdaptor from '../../shared/json/JSONParserAdaptor';
import TransformerAdaptor from '../../shared/TransformerAdaptor';
import XMLParserAdaptor from '../../shared/xml/XMLParserAdaptor';
import XMLPathAdaptor from '../../shared/xml/XMLPathAdaptor';
import IngestEPGDomain from '../IngestEPGDomain';

const TEST_TABLE_NAME = 'test-ingestEPGDomain';
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

describe('Ingest EPG Domain', () => {
  const uid = new UIDGenerator();
  const epgTemplateFactory = new EPGTemplateFactory(uid);
  const epgTemplateRepository = new EPGTemplateRepository(
    ddbClient,
    TEST_TABLE_NAME,
    epgTemplateFactory,
  );
  const epgProgramBuilder = new EPGProgramBuilder(uid);
  const epgFactory = new EPGFactory(uid, epgTemplateRepository);
  const epgRepostiory = new EPGRepository(
    ddbClient,
    TEST_TABLE_NAME,
    epgFactory,
    epgProgramBuilder,
  );

  const httpClient = new HttpClientAdaptor();
  const transformerAdaptor = new TransformerAdaptor();
  const csvToObject = new CSVToObject();
  const xmlPath = new XMLPathAdaptor();
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

  const ingestEpgDomain = new IngestEPGDomain(epgRepostiory, {
    csv: csvParser,
    json: jsonParser,
    xml: xmlParser,
  }, epgFactory);

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
    jest.setSystemTime(new Date('2022-10-17'));
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('should throw EPG Not Found Exception', async () => {
    await expect(async () => ingestEpgDomain.ingestEPG('')).rejects.toThrow(EPGError.EPGNotFound);
  });

  it('should update JSON programs', async () => {
    const epgTemplate = await epgTemplateFactory.toDomain(validJSONMappingTemplate);
    await epgTemplateRepository.save(epgTemplate);
    const epg = await epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplate.id,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: [],
      ingestionUrl: 'https://d2d6fj119jntet.cloudfront.net/Jest/test-epg.json',
    });
    await epgRepostiory.save(epg);

    const savedEpg = await epgRepostiory.findOne(epg.id);
    expect(savedEpg!.programs).toEqual([]);
    expect(savedEpg!.createdAt).toEqual('2022-10-17T00:00:00.000Z');
    expect(savedEpg!.updatedAt).toEqual('2022-10-17T00:00:00.000Z');

    jest.setSystemTime(new Date('2022-10-18'));
    await ingestEpgDomain.ingestEPG(epg.id);

    const updatedEpg = await epgRepostiory.findOne(epg.id, { filter: { startTime: '2022-11-30', endTime: '2023' }, ignore: false });
    expect(updatedEpg!.createdAt).toEqual('2022-10-17T00:00:00.000Z');
    expect(updatedEpg!.updatedAt).toEqual('2022-10-18T00:00:00.000Z');
    const previousPrograms = updatedEpg!.programs;
    expect(updatedEpg!.programs).toHaveLength(16);
    await ingestEpgDomain.ingestEPG(epg.id);
    const secondIngestEpg = await epgRepostiory.findOne(epg.id, { filter: { startTime: '2022-11-30', endTime: '2023' }, ignore: false });
    // Check epg programs are kept if there are multiple ingestions
    expect(secondIngestEpg!.programs).toHaveLength(16);
    expect(secondIngestEpg!.programs).toEqual(previousPrograms);
  });

  it('should update CSV programs', async () => {
    const epgTemplate = await epgTemplateFactory.toDomain(validCSVMappingTemplate);
    await epgTemplateRepository.save(epgTemplate);
    const epg = await epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplate.id,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: [],
      ingestionUrl: 'https://d2d6fj119jntet.cloudfront.net/Jest/test-epg.csv',
    });
    await epgRepostiory.save(epg);

    const savedEpg = await epgRepostiory.findOne(epg.id);
    expect(savedEpg!.programs).toEqual([]);

    jest.setSystemTime(new Date('2022-10-18'));
    await ingestEpgDomain.ingestEPG(epg.id);

    const updatedEpg = await epgRepostiory.findOne(epg.id, { filter: { startTime: '2021', endTime: '2023' }, ignore: false });
    expect(updatedEpg!.programs).toHaveLength(2);
  });

  it('should update XML programs', async () => {
    const epgTemplate = await epgTemplateFactory.toDomain(validXMLMappingTemplate);
    await epgTemplateRepository.save(epgTemplate);
    const epg = await epgFactory.toDomain({
      name: 'ABC (KAAL) EPG',
      extId: 'abc-kaal',
      thumbnail: 'epg/epgid/thumbnail.png',
      timezone: 'UTC',
      epgTemplate: epgTemplate.id,
      ingestionSchedule: '0 8 ? 1-12 1-7 *', // Cron schedule
      programs: [],
      ingestionUrl: 'https://d2d6fj119jntet.cloudfront.net/Jest/test-epg-small.xml',
    });
    await epgRepostiory.save(epg);

    const savedEpg = await epgRepostiory.findOne(epg.id);
    expect(savedEpg!.programs).toEqual([]);

    jest.setSystemTime(new Date('2022-10-18'));
    await ingestEpgDomain.ingestEPG(epg.id);

    const updatedEpg = await epgRepostiory.findOne(epg.id, { filter: { startTime: '2022', endTime: '2023' }, ignore: false });
    expect(updatedEpg!.programs).toHaveLength(30);
  });
});
