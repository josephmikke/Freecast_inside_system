import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import DynamoDBTableUtils from '../../../../utils/database-table-utils';
import { EPGTemplateRequestDto, EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import EPGTemplate from '../EPGTemplate';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

import EPGTemplateFactory from '../EPGTemplateFactory';
import EPGTemplateRepository from '../EPGTemplateRepository';

const TEST_TABLE_NAME = 'test-epgTemplateRepository';
const ddbClient = new DynamoDBClient({
  endpoint: 'http://localhost:8000',
  region: 'localhost',
  credentials: {
    accessKeyId: 'xxx',
    secretAccessKey: 'yyy',
  },
});

const UID = new UIDGenerator().generate(8);
const EPG_UID = {
  generate: () => UID,
};
const epgFactory = new EPGTemplateFactory(EPG_UID);
const epgTemplateRequestDto: EPGTemplateRequestDto = {
  extId: 'json-template',
  mapping: {
  },
  name: 'JSON',
  templateType: EpgTemplateType.JSON,
};
const epgTemplateRepository = new EPGTemplateRepository(ddbClient, TEST_TABLE_NAME, epgFactory);
let epgTemplate: EPGTemplate;

describe('EPG Template Repository', () => {
  beforeAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'create');
  });

  afterAll(async () => {
    await DynamoDBTableUtils(ddbClient, TEST_TABLE_NAME, 'drop');
  });

  it('should check if item already exist and return false', async () => {
    expect(await epgTemplateRepository.exists({
      createdAt: '',
      extId: '',
      id: '',
      mapping: {},
      name: '',
      updatedAt: '',
      enabled: true,
      templateType: EpgTemplateType.JSON,
    })).toBeFalsy();
  });

  it('should save a new item', async () => {
    epgTemplate = await epgFactory.toDomain(epgTemplateRequestDto);
    expect(await epgTemplateRepository.save(epgTemplate)).toBeTruthy();
  });

  it('should find an item', async () => {
    expect(await epgTemplateRepository.findOne(UID)).toEqual(epgTemplate);
  });

  it('should find an item and return undefined', async () => {
    expect(await epgTemplateRepository.findOne('0')).toBeUndefined();
  });

  it('should check if epg template already exist and return true', async () => {
    expect(await epgTemplateRepository.exists(epgTemplate)).toBeTruthy();
  });

  it('should remove an item', async () => {
    expect(await epgTemplateRepository.remove(epgTemplate)).toBeTruthy();
  });

  it('should find all epg templates', async () => {
    const templates = await Promise.all(Array.from(Array(10)
      .keys()).map(async (item) => {
      const epgTemplateEntity = await epgFactory.toDomain({
        createdAt: '2022-11-10T17:10:000Z',
        updatedAt: '2022-11-10T17:10:000Z',
        extId: `json-template#${item}`,
        id: item.toString(),
        mapping: {},
        name: `JSON #${item}`,
        templateType: EpgTemplateType.JSON,
      });
      await epgTemplateRepository.save(epgTemplateEntity);
      return epgTemplateEntity;
    }));
    // Sort array to match repository response order (by name ASC)
    templates.sort((a, b) => {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    expect(await epgTemplateRepository.findAll()).toEqual(templates);
  });

  it('should check for dependencies', async () => {
    epgTemplate = await epgFactory.toDomain(epgTemplateRequestDto);
    await epgTemplateRepository.save(epgTemplate);
    await epgTemplateRepository.putItem({
      PK: 'CHANNEL#1',
      SK: `ASSET#EPG_TEMPLATE#${UID}`,
      entityType: 'CHANNEL',
      'GSI1-PK': `ASSET#EPG_TEMPLATE#${UID}`,
      'GSI1-SK': 'CHANNEL#1',
    });

    expect(await epgTemplateRepository.hasRelationships(epgTemplate)).toBeTruthy();
  });
});

describe.each([
  (payload: EPGTemplate) => epgTemplateRepository.remove(payload),
  (payload: EPGTemplate) => epgTemplateRepository.save(payload),
  (payload: EPGTemplate) => epgTemplateRepository.exists(payload),
  (payload: EPGTemplate) => epgTemplateRepository.hasRelationships(payload),
  (id: string) => epgTemplateRepository.findOne(id),
  () => epgTemplateRepository.findAll(),
])('Exceptions', (func) => {
  // Don't create table to force Exception

  it(`${func} should throw an error`, async () => {
    // @ts-ignore
    await expect(async () => func()).rejects.toThrow();
  });
});
