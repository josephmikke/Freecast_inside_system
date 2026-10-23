import EPGProgramBuilder from '../../EPGProgramBuilder';
import HttpClientAdaptor from '../../HttpClientAdaptor';
import TransformerAdaptor from '../../TransformerAdaptor';
import XMLParserAdaptor from '../XMLParserAdaptor';
import XMLPathAdaptor from '../XMLPathAdaptor';

import {
  xmlMappingTemplate,
  xmlPayload,
  xmlMappingTemplate2,
  xmlPayload2,
  xmlPayload3,
  xmlMappingTemplate3,
} from './testObjects';

import UIDGenerator from '/opt/nodejs/powertools/UIDGenerator';

describe('XML Parser Adaptor - EPG', () => {
  const uid = new UIDGenerator();
  const httpClient = new HttpClientAdaptor();
  const transformerAdaptor = new TransformerAdaptor();
  const xmlPath = new XMLPathAdaptor();
  const epgBuilder = new EPGProgramBuilder(uid);
  const xmlParser = new XMLParserAdaptor(httpClient, xmlPath, transformerAdaptor, epgBuilder);

  it('should fetch a response from link using XML Parser', async () => {
    const res = await xmlParser.fetch('https://d2d6fj119jntet.cloudfront.net/Jest/test-epg-small.xml');

    expect(res.value.charAt(0)).toBe('<');
  });

  it('should parse XML using Mapping', async () => {
    const payload = { value: xmlPayload };

    const result = xmlParser.parse(payload, xmlMappingTemplate);

    const expectedResult = {
      title: 'NASA 50th Anniversary Documentary',
      ext_id: '11246766',
      duration: '1740',
      start_time: '2022-08-23T00:00:00Z',
      end_time: '2022-08-23T00:29:00Z',
      description: 'Descriptionum Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      catchup: false,
      slug: '',
      thumbnail: 'https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/11246766-TCL-Thumbnail_v1.jpeg https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-default_v5.jpeg https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-defaults_v1.jpeg',
      alternateThumbnail: null,
      archive: false,
      rating: null,
      subtitle: null,
    };

    expect(result[0]).toMatchObject(expectedResult);
  });

  it('should parse XML using Mapping - Second Mapping', async () => {
    const payload2 = { value: xmlPayload2 };

    const result2 = xmlParser.parse(payload2, xmlMappingTemplate2);

    const expectedResult2 = {
      title: 'NASA 50th Anniversary Documentary',
      ext_id: '11246766',
      duration: '1740',
      start_time: '2022-08-23T00:00:00Z',
      end_time: '2022-08-23T00:29:00Z',
      description: 'Descriptionum Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      catchup: true,
      slug: '',
      thumbnail: 'https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/11246766-TCL-Thumbnail_v1.jpeg https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-default_v5.jpeg https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-defaults_v1.jpeg',
      alternateThumbnail: null,
      archive: false,
      rating: null,
      subtitle: 'NASA 50th Anniversary Documentary',
    };

    expect(result2[0]).toMatchObject(expectedResult2);
  });

  it('should parse XML using Mapping - Third Mapping', async () => {
    const payload3 = { value: xmlPayload3 };

    const result3 = xmlParser.parse(payload3, xmlMappingTemplate3);

    const expectedResult3 = {
      title: 'NASA 50th Anniversary Documentary',
      ext_id: '11246766',
      duration: '1740',
      start_time: '2022-08-23T00:00:00Z',
      end_time: '2022-08-23T00:29:00Z',
      description: 'Descriptionum Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
      catchup: true,
      slug: '333',
      thumbnail: 'https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/11246766-TCL-Thumbnail_v1.jpeg https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-default_v5.jpeg https://dki01q1l7yn3y.cloudfront.net/thumbnails-platform-prod/assets/cs::content::episodes/5491-7539/Ask-Nasa-2-defaults_v1.jpeg',
      alternateThumbnail: null,
      archive: false,
      rating: null,
      subtitle: 'NASA 50th Anniversary Documentary',
    };

    expect(result3[0]).toMatchObject(expectedResult3);
  });
});
