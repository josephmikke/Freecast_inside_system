import axios, { InternalAxiosRequestConfig } from 'axios';
import { useQuery } from 'react-query';

const api = axios.create({
  baseURL: process.env.REACT_APP_DRM_API_URL,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // eslint-disable-next-line no-param-reassign
  config.headers['x-api-key'] = process.env.REACT_APP_DRM_API_KEY;

  return config;
});

const getLicences = async () => api.get('/auth-xml-generator');
const useLicence = () => useQuery('license', getLicences);

export {
  // eslint-disable-next-line import/prefer-default-export
  useLicence,
};
