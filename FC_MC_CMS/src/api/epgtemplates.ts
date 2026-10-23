import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'epgTemplates';

const getEpgTemplates = async () => api.get(BASE_URL);
const getEpgTemplate = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addEpgTemplate = async (data: any) => api.post(BASE_URL, data);
const updateEpgTemplate = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const deleteEpgTemplate = async (id: string) => api.delete(`${BASE_URL}/${id}`);

const useEpgTemplates = () => useQuery('epgTemplates', getEpgTemplates);
const useEpgTemplate = (id: string) => useQuery(['EpgTemplate', id], () => getEpgTemplate(id));

export {
  getEpgTemplates,
  getEpgTemplate,
  addEpgTemplate,
  updateEpgTemplate,
  deleteEpgTemplate,
  useEpgTemplate,
  useEpgTemplates,
};
