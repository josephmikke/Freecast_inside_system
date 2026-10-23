import { api } from '@api/misc';

const BASE_URL = 'vod/ingestions';

const getIngestions = async (nextToken?: string) => api.get(nextToken ? `${BASE_URL}?nextToken=${nextToken}&limit=100` : `${BASE_URL}?limit=100`);
const ingest = async (data: any) => api.post('vod/ingest', data);

export {
  getIngestions,
  ingest,
};
