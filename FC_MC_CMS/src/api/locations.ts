import { useQuery } from 'react-query';
import { api } from '@api/misc';

const BASE_URL = 'locations';

const getLocations = async () => api.get(BASE_URL);
const getLocation = async (id: string) => api.get(`${BASE_URL}/${id}`);
const addLocation = async (data: any) => api.post(BASE_URL, data);
const updateLocation = async (id: string, data: any) => api.patch(`${BASE_URL}/${id}`, data);
const deleteLocation = async (id: string) => api.delete(`${BASE_URL}/${id}`);

const useLocations = () => useQuery('locations', getLocations);
const useLocation = (id: string) => useQuery(['location', id], () => getLocation(id));

export {
  getLocations,
  getLocation,
  addLocation,
  updateLocation,
  deleteLocation,
  useLocation,
  useLocations,
};
