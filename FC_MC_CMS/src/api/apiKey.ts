import { api } from '@api/misc';

const BASE_URL = 'apiKey';

const getApiKey = async (token: string) => api.get(`${BASE_URL}`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export {
  // eslint-disable-next-line import/prefer-default-export
  getApiKey,
};
