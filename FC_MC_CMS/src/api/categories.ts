import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'categories';

const getCategories = async () => api.get(BASE_URL);
const getCategory = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addCategory = async (data: any) => api.post(BASE_URL, data);
const updateCategory = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const updateWeightCategory = async (id: string, weightIndex: number) => api.get(`${BASE_URL}/${id}/weight/${weightIndex}`);
const deleteCategory = async (id: string) => api.delete(`${BASE_URL}/${id}`);

const useCategories = () => useQuery('categories', getCategories);
const useCategory = (id: string) => useQuery(['category', id], () => getCategory(id));

export {
  getCategories,
  getCategory,
  addCategory,
  updateWeightCategory,
  updateCategory,
  deleteCategory,
  useCategory,
  useCategories,
};
