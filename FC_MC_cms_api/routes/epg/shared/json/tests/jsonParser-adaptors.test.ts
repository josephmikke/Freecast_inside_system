import http from 'node:http';
import { AddressInfo } from 'node:net';

import jp from 'jsonpath';

import EPGProgramBuilder from '../../EPGProgramBuilder';
import HttpClientAdaptor from '../../HttpClientAdaptor';
import TransformerAdaptor from '../../TransformerAdaptor';
import JsonParserAdaptor from '../JSONParserAdaptor';

import {
  mappingTemplate, testPayload, mappingTemplate2, testPayload2, testPayload3, mappingTemplate3,
} from './testObjects';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

describe('Json Parser Adaptor - EPG', () => {
  const uid = new UIDGenerator();
  const httpClient = new HttpClientAdaptor();
  const transformerAdaptor = new TransformerAdaptor();
  const epgBuilder = new EPGProgramBuilder(uid);
  const jsonParser = new JsonParserAdaptor(httpClient, jp, transformerAdaptor, epgBuilder);

  let server: http.Server;
  let baseUrl: string;

  // A local server instead of jsonplaceholder.typicode.com, which is unreachable from CI at times.
  beforeAll(async () => {
    server = http.createServer((_req, res) => {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ id: 1, name: 'Leanne Graham' }));
    });
    await new Promise<void>((resolve) => { server.listen(0, '127.0.0.1', resolve); });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => { server.close(resolve); });
  });

  it('should fetch a response from link using Json Parser', async () => {
    const res = await jsonParser.fetch(`${baseUrl}/users/1`);

    const result = JSON.parse(JSON.stringify(res));

    expect(result.name).toBe('Leanne Graham');
  });

  it('should parse JSON using JsonPath - First Mapping', async () => {
    const result = jsonParser.parse(testPayload, mappingTemplate);

    const expectedResult = {
      title: 'YFi Highlights',
      ext_id: '202837105',
      duration: '7200',
      end_time: '2022-11-30T13:59:59Z',
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/3x4_Vertical_YF.jpg',
      alternateThumbnail: null,
      archive: false,
      rating: null,
      start_time: '2022-11-30T11:59:59Z',
      description: 'YFI Highlights brings you a roundup of the best business and finance stories of the day.',
      catchup: false,
      slug: '',
      subtitle: null,
    };

    expect(result[0]).toMatchObject(expectedResult);
  });

  it('should parse JSON using JsonPath - Second Mapping', async () => {
    const result2 = jsonParser.parse(testPayload2, mappingTemplate2);

    const expectedResult2 = {
      title: 'Yahoo! Finance Live',
      ext_id: '202639449',
      duration: '3600',
      start_time: '2022-11-30T13:59:59Z',
      end_time: '2022-11-30T14:59:59Z',
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
      alternateThumbnail: null,
      archive: false,
      rating: null,
      description: 'Live market coverage and analysis.',
      catchup: true,
      slug: 'sc-202639449',
      subtitle: 'Test subtitle',
    };

    expect(result2[0]).toMatchObject(expectedResult2);
  });

  it('should parse JSON using JsonPath - Third Mapping', async () => {
    const result3 = jsonParser.parse(testPayload3, mappingTemplate3);

    const expectedResult3 = {
      title: 'Yahoo! Finance Live',
      ext_id: '202639449',
      duration: '3600',
      start_time: '2022-11-30T13:59:59Z',
      end_time: '2022-11-30T14:59:59Z',
      thumbnail: 'https://s.yimg.com/cv/apiv2/default/20200421/16x9_YF_LiveRedesign.jpg',
      alternateThumbnail: null,
      archive: false,
      rating: null,
      description: 'Live market coverage and analysis.',
      catchup: true,
      slug: 'sc-202639449',
      subtitle: 'Test subtitle',
    };

    expect(result3[0]).toMatchObject(expectedResult3);
  });
});
