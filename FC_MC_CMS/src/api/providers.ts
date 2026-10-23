import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'providers';

const getProviders = async () => api.get(BASE_URL);
const getProvider = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addProvider = async (data: any) => api.post(BASE_URL, data);
const updateProvider = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const deleteProvider = async (id: string) => api.delete(`${BASE_URL}/${id}`);

const useProviders = () => useQuery('providers', getProviders);
const useProvider = (id: string) => useQuery(['provider', id], () => getProvider(id));

export {
  getProviders,
  getProvider,
  addProvider,
  updateProvider,
  deleteProvider,
  useProvider,
  useProviders,
};
