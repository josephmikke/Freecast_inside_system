import axios, { InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.REACT_APP_API_URL;
const API_SERVICE_URL = process.env.REACT_APP_API_SERVICE_URL;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const apiKey = localStorage.getItem('apiKey');
  // const userEmail = localStorage.getItem('userEmail');

  if (apiKey) {
    // eslint-disable-next-line no-param-reassign
    config.headers['x-api-key'] = apiKey;
    // eslint-disable-next-line no-param-reassign
    // config.headers['x-user-email'] = userEmail;
  }

  return config;
});

const apiService = axios.create({
  baseURL: API_SERVICE_URL,
});

export {
  API_URL,
  api,
  apiService,
};
