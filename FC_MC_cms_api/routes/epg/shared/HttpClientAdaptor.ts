import https from 'node:https';

import { HttpAgent, HttpsAgent } from 'agentkeepalive';
import fetch from 'cross-fetch';

import { IHttpClient } from './IHttpClient';

const AGENT_OPTIONS = {
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: 60000, // active socket keepalive for 60 seconds
  freeSocketTimeout: 30000, // free socket keepalive for 30 seconds
};

export default class HttpClientAdaptor implements IHttpClient<Response> {
  private keepaliveAgent = new HttpsAgent(AGENT_OPTIONS);

  private httpKeepaliveAgent = new HttpAgent(AGENT_OPTIONS);

  async get(url: string): Promise<Response> {
    // Without an explicit agent, node-fetch falls back to the global agent and every call
    // pays for a fresh TLS handshake. Reusing the keepalive pool bounds the sockets we hold.
    // Ingestion URLs are caller-supplied, so pick the agent per protocol — node-fetch
    // resolves the function form against the parsed URL.
    const agent = (parsedUrl: { protocol: string }) => (
      parsedUrl.protocol === 'http:' ? this.httpKeepaliveAgent : this.keepaliveAgent
    );

    return fetch(url, { agent } as RequestInit);
  }

  async getThumb(url: string) {
    const options = {
      agent: this.keepaliveAgent,
    };

    return new Promise((resolve, reject) => {
      const req = https.get(url, options, (res) => {
        const rawData: Uint8Array[] = [];
        let textData = '';
        console.log(`STATUS: ${res.statusCode}`);
        console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
        res.setEncoding('binary');
        res.on('data', (chunk) => {
          rawData.push(Buffer.from(chunk, 'binary'));
          textData += chunk;
        });
        res.on('end', () => {
          const buffer = Buffer.concat(rawData);
          const response: Response = {
            ...res,
            // @ts-ignore
            headers: res.headers,
            status: res.statusCode || 500,
            statusText: res.statusMessage || '',
            url,
            ok: true,
            // @ts-ignore
            arrayBuffer: () => Promise.resolve(buffer),
            json: () => Promise.resolve(JSON.parse(textData)),
            text: () => Promise.resolve(textData),
            redirected: false,
            type: 'default',
            body: null,
            bodyUsed: false,
            blob(): Promise<Blob> {
              throw new Error('Function not implemented.');
            },
            formData(): Promise<FormData> {
              throw new Error('Function not implemented.');
            },
            clone(): Response {
              throw new Error('Function not implemented.');
            },
          };
          resolve({ ...response });
        });
      });
      req.on('error', (e) => {
        console.log(`problem with request: ${e.message}`);
        console.log(e);
        // Always tear the socket down and settle. Bailing out early here used to leave the
        // promise pending and the descriptor open — the ECONNRESET/EMFILE branch is exactly
        // the one that fires when we are already close to exhausting descriptors.
        req.destroy();
        reject(e);
      });
      req.end();
    });
  }
}
