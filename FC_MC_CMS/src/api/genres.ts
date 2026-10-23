import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'genres';

const getGenres = async () => api.get(BASE_URL);
const getGenre = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addGenre = async (data: any) => api.post(BASE_URL, data);
const updateGenre = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const updateWeightGenre = async (id: string, weightIndex: number) => api.get(`${BASE_URL}/${id}/weight/${weightIndex}`);
const deleteGenre = async (id: string) => api.delete(`${BASE_URL}/${id}`);

const useGenres = () => useQuery('genres', getGenres);
const useGenre = (id: string) => useQuery(['genre', id], () => getGenre(id));

export {
  getGenres,
  getGenre,
  addGenre,
  updateGenre,
  updateWeightGenre,
  deleteGenre,
  useGenre,
  useGenres,
};
