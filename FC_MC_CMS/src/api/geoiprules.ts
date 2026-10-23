import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'rules';

const getGeoIpRules = async () => api.get(BASE_URL);
const addGeoIpRule = async (data: any) => api.post(BASE_URL, data);
const updateGeoIpRule = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const deleteGeoIpRule = async (id: string) => api.delete(`${BASE_URL}/${id}`);
const updateWeightGeopIpRule = async (id: string, weightIndex: number) => api.get(`${BASE_URL}/${id}/weight/${weightIndex}`);

const useGeoIpRules = () => useQuery('geoiprules', getGeoIpRules);

export {
  getGeoIpRules,
  addGeoIpRule,
  updateWeightGeopIpRule,
  updateGeoIpRule,
  deleteGeoIpRule,
  useGeoIpRules,
};
