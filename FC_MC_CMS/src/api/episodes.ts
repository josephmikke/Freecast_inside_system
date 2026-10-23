import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'vod/episodes';

const getEpisodes = async () => api.get(BASE_URL);
const getEpisode = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addEpisode = async (data: any) => api.post(BASE_URL, data);
const updateEpisode = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const deleteEpisode = async (id: string) => api.delete(`${BASE_URL}/${id}`);
const useEpisodes = () => useQuery('episode', getEpisodes);
const useEpisode = (id: string) => useQuery(['episode', id], () => getEpisode(id));

export {
  getEpisodes,
  getEpisode,
  addEpisode,
  updateEpisode,
  deleteEpisode,
  useEpisode,
  useEpisodes,
};
