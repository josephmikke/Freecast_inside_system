import EPGProgramBuilder from '../../EPGProgramBuilder';
import HttpClientAdaptor from '../../HttpClientAdaptor';
import TransformerAdaptor from '../../TransformerAdaptor';
import CSVParserAdaptor from '../CSVParserAdaptor';
import CSVToObject from '../CSVToObject';

import {
  csvPayload,
  csvMappingTemplate,
  csvPayload2,
  csvMappingTemplate2,
  csvPayload3,
  csvMappingTemplate3,
} from './testObjects';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

describe('CSV Parser Adaptor - EPG', () => {
  const uid = new UIDGenerator();
  const httpClient = new HttpClientAdaptor();
  const transformerAdaptor = new TransformerAdaptor();
  const csvToObject = new CSVToObject();
  const epgBuilder = new EPGProgramBuilder(uid);
  const csvParser = new CSVParserAdaptor(
    httpClient,
    csvToObject,
    transformerAdaptor,
    epgBuilder,
  );

  it('should fetch a response from link using CSV Parser', async () => {
    const res = await csvParser.fetch('https://d2d6fj119jntet.cloudfront.net/Jest/test-epg.csv');

    expect(res.value.charAt(0)).toBe('T');
  });

  it('should parse CSV using First Mapping', async () => {
    const payload = { value: csvPayload };

    const result = csvParser.parse(payload, csvMappingTemplate);

    const expectedResult = {
      title: 'GrateTV All Day',
      ext_id: '32563',
      duration: '3600',
      start_time: '2022-12-09T05:30:00Z',
      end_time: '2022-12-09T06:30:00Z',
      description: 'GrateTV All Day',
      catchup: false,
      slug: '',
      thumbnail: '',
      alternateThumbnail: null,
      archive: false,
      rating: null,
      subtitle: null,
    };

    expect(result[0]).toMatchObject(expectedResult);
  });

  it('should parse CSV using Second Mapping', async () => {
    const payload2 = { value: csvPayload2 };

    const result2 = csvParser.parse(payload2, csvMappingTemplate2);

    const expectedResult = {
      title: 'GrateTV All Day',
      ext_id: '32563',
      duration: '3600',
      start_time: '2022-12-09T05:30:00Z',
      end_time: '2022-12-09T06:30:00Z',
      description: 'GrateTV All Day',
      catchup: true,
      slug: '',
      thumbnail: '',
      alternateThumbnail: null,
      archive: false,
      rating: null,
      subtitle: null,
    };

    expect(result2[0]).toMatchObject(expectedResult);
  });

  it('should parse CSV using Third Mapping', async () => {
    const payload3 = { value: csvPayload3 };

    const result3 = csvParser.parse(payload3, csvMappingTemplate3);

    const expectedResult = {
      title: 'GrateTV All Day',
      ext_id: '32563',
      duration: '3600',
      start_time: '2022-12-09T05:30:00Z',
      end_time: '2022-12-09T06:30:00Z',
      description: 'GrateTV All Day',
      catchup: true,
      slug: '333',
      thumbnail: '',
      alternateThumbnail: null,
      archive: false,
      rating: null,
      subtitle: 'GrateTV',
    };

    expect(result3[0]).toMatchObject(expectedResult);
  });
});
