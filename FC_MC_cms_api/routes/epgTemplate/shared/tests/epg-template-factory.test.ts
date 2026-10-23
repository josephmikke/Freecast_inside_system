import { EPGTemplateRequestDto, EpgTemplateType } from '../../../shared/dto/EPGTemplateDto';
import EPGTemplate from '../EPGTemplate';
import EPGTemplateFactory from '../EPGTemplateFactory';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2022-10-17'));
});

afterAll(() => {
  jest.useRealTimers();
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

describe('EPG Template factory', () => {
  it('should create an EPG Template instance', async () => {
    const epgTemplate: EPGTemplate = await epgFactory.toDomain(epgTemplateRequestDto);
    expect(epgTemplate).toEqual({
      id: UID,
      name: 'JSON',
      extId: 'json-template',
      mapping: {},
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      templateType: 'JSON',
    });
  });

  it('should create an EPG Template instance with an existing ID', async () => {
    const epgTemplate: EPGTemplate = await epgFactory.toDomain({ ...epgTemplateRequestDto, id: 'existingId' });
    expect(epgTemplate).toEqual({
      id: 'existingId',
      name: 'JSON',
      extId: 'json-template',
      mapping: {},
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
      templateType: 'JSON',
    });
  });

  it('should create an EPGTemplateDto', async () => {
    const epgTemplate: EPGTemplate = await epgFactory.toDomain(epgTemplateRequestDto);
    const epgTemplateDto = await epgFactory.toPersistence(epgTemplate);
    expect(epgTemplateDto).toEqual({
      id: UID,
      name: 'JSON',
      extId: 'json-template',
      templateType: 'JSON',
      mapping: {},
      createdAt: '2022-10-17T00:00:00.000Z',
      updatedAt: '2022-10-17T00:00:00.000Z',
      enabled: true,
    });
  });
});
