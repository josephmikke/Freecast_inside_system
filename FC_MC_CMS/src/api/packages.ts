import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'packages';

const getPackages = async () => api.get(BASE_URL);
const getPackage = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addPackage = async (data: any) => api.post(BASE_URL, data);
const updatePackage = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const updateWeightPackage = async (id: string, weightIndex: number) => api.get(`${BASE_URL}/${id}/weight/${weightIndex}`);
const deletePackage = async (id: string) => api.delete(`${BASE_URL}/${id}`);

const usePackages = () => useQuery('packages', getPackages);
const usePackage = (id: string) => useQuery(['package', id], () => getPackage(id));

export {
  getPackages,
  getPackage,
  addPackage,
  updatePackage,
  updateWeightPackage,
  deletePackage,
  usePackage,
  usePackages,
};
