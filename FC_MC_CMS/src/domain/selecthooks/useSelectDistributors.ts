import { useMemo } from 'react';
import { Distributors } from '@api/index';
import { DistributorResult } from '@entities/content/distributor';

export default function useSelectDistributors() {
  const {
    data: distributorsData,
    error: distributorsError,
    isFetching: distributorsIsFetching,
  } = Distributors.useDistributors();

  return useMemo(
    () => {
      if (!distributorsData?.data || distributorsError || distributorsIsFetching) return [];
      return distributorsData?.data.map((dist: DistributorResult) => ({
        label: dist.name, value: dist.id,
      }));
    },
    [distributorsError, distributorsData, distributorsIsFetching],
  );
}
