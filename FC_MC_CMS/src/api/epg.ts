import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'epg';

const getEpgs = async () => api.get(BASE_URL);
const getEpg = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addEpg = async (data: any) => api.post(BASE_URL, data);
const updateEpg = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const updateProgram = async (epgId: string, programId: string, data: any) => api.patch(`${BASE_URL}/${epgId}/program/${programId}`, data);
const deleteEpg = async (id: string) => api.delete(`${BASE_URL}/${id}`);
const triggerIngestionEpg = async (id: string) => api.get(`${BASE_URL}/${id}/ingest`);
const repairIngestionEpg = async (id: string) => api.post(`${BASE_URL}/${id}/repair`);
const validateIngestionEpg = async (id: string) => api.get(`${BASE_URL}/${id}/validate`);
const repairEpg = async (id: string) => api.post(`${BASE_URL}/${id}/repair`);

const useEpgs = () => useQuery('epgs', getEpgs);
const useEpg = (id: string) => useQuery(['Epg', id], () => getEpg(id));

export {
  getEpgs,
  updateProgram,
  triggerIngestionEpg,
  repairIngestionEpg,
  validateIngestionEpg,
  repairEpg,
  getEpg,
  addEpg,
  updateEpg,
  deleteEpg,
  useEpg,
  useEpgs,
};
