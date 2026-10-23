import { useQuery } from 'react-query';
import { apiService } from '@api/misc';

const BASE_URL = '/branding/api/v0/brands/';

const getBrands = async () => apiService.get(BASE_URL);

const useBrands = () => useQuery('brands', getBrands);

export {
  // eslint-disable-next-line import/prefer-default-export
  useBrands,
};
