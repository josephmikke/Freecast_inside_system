import http from 'node:http';
import { AddressInfo } from 'node:net';

import HttpClientAdaptor from '../../../../epg/shared/HttpClientAdaptor';
import ImageAdaptor from '../ImageAdaptor';

const httpClient = new HttpClientAdaptor();

// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('Image Adaptor', () => {
  let server: http.Server;
  let baseUrl: string;

  // A local server instead of the CloudFront sample and a made-up host, so the outcome does
  // not depend on the network the runner happens to have.
  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/Freecast.png') {
        res.writeHead(200, { 'content-type': 'image/png' });
        res.end(PNG);
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    await new Promise<void>((resolve) => { server.listen(0, '127.0.0.1', resolve); });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => { server.close(resolve); });
  });

  it('It should get image and should not throw any error', async () => {
    const imageAdaptor = new ImageAdaptor(httpClient);

    await expect(imageAdaptor.ingest(`${baseUrl}/Freecast.png`)).resolves.not.toThrow();

    expect(imageAdaptor.value()).toEqual(`data:image/png;base64,${PNG.toString('base64')}`);
  });

  it('It should fall back to the no-thumbnail image and should not throw any error', async () => {
    const imageAdaptor = new ImageAdaptor(httpClient);

    await expect(imageAdaptor.ingest(`${baseUrl}/missing.png`)).resolves.not.toThrow();

    expect(imageAdaptor.value()).toEqual(process.env.NO_THUMBNAIL_URL);
  });
});
