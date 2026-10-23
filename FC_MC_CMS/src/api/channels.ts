import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'channels';

const getChannels = async (
  nextToken?: string,
  searchValue?: string,
  categories?: string[],
  packages?: string[],
  platforms?: string[],
  providers?: string[],
  active?: string,
) => {
  const defaultExclude = 'programs,distributors,brands,genres,locations,streams,epg';
  let url = BASE_URL;

  if (nextToken) {
    url += `?nextToken=${nextToken}&exclude=${defaultExclude}`;
  } else {
    url += `?exclude=${defaultExclude}`;
  }

  if (searchValue?.length) {
    url += `&search=${searchValue}&limit=150`;
  } else {
    url += '&limit=50';
  }

  if (categories?.length) {
    url += `&categories=${categories.join(',')}`;
  }

  if (packages?.length) {
    url += `&packages=${packages.join(',')}`;
  }

  if (platforms?.length) {
    url += `&platforms=${platforms.join(',')}`;
  }

  if (providers?.length) {
    url += `&providers=${providers.join(',')}`;
  }

  if (active?.length) {
    url += `&active=${active}`;
  }

  return api.get(url);
};

const getPackageChannels = async (packageId: string, exclude: string) => api.get(`${BASE_URL}?packages=${packageId}${exclude.length > 0 ? `&exclude=${exclude}` : ''}`);
const getChannel = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addChannel = async (data: any) => api.post(BASE_URL, data);
const updateChannel = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const deleteChannel = async (id: string) => api.delete(`${BASE_URL}/${id}`);

const usePackageChannels = (id: string, exclude = '') => useQuery(['channels', id], () => getPackageChannels(id, exclude));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useChannel = (id: string) => useQuery({
  queryKey: ['channel', { id }],
  queryFn: () => getChannel(id),
});

export {
  getChannels,
  getChannel,
  addChannel,
  updateChannel,
  deleteChannel,
  useChannel,
  usePackageChannels,
};
