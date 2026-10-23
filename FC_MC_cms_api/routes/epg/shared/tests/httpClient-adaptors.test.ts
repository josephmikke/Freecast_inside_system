import http from 'node:http';
import { AddressInfo } from 'node:net';

import HttpClientAdaptor from '../HttpClientAdaptor';

describe('Http Client Adaptor - EPG', () => {
  const httpClient = new HttpClientAdaptor();
  let server: http.Server;
  let baseUrl: string;

  // A local server instead of jsonplaceholder.typicode.com, whose sockets kept hanging up.
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

  it('should get a response from a link', async () => {
    const res = await httpClient.get(`${baseUrl}/users/1`);

    const result = await res.json();
    expect(result.name).toBe('Leanne Graham');
  });
});
