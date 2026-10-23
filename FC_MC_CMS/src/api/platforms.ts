import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'platforms';

const getPlatforms = async () => api.get(BASE_URL);
const getPlatform = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addPlatform = async (data: any) => api.post(BASE_URL, data);
const updatePlatform = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const deletePlatform = async (id: string) => api.delete(`${BASE_URL}/${id}`);

const usePlatforms = () => useQuery('platforms', getPlatforms);
const usePlatform = (id: string) => useQuery(['platform', id], () => getPlatform(id));

export {
  getPlatforms,
  getPlatform,
  addPlatform,
  updatePlatform,
  deletePlatform,
  usePlatform,
  usePlatforms,
};
