import { useQuery } from 'react-query';
import { apiService } from '@api/misc';

const BASE_URL = '/affiliates/api/distributors';

const getDistributors = async () => apiService.get(BASE_URL);

const useDistributors = () => useQuery('distributors', getDistributors);

export {
  // eslint-disable-next-line import/prefer-default-export
  useDistributors,
};
