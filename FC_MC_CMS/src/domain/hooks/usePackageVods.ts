import { useMemo } from 'react';
import { Vods } from '@/api';

const excludeOnVOD = 'provider,epg,platforms,categories,packages,genres,locations,streams,distributors,brands';

export default function usePackageVods(packageId: string) {
  const {
    data,
    error,
    isFetching,
    refetch,
  } = Vods.usePackageVods(packageId, excludeOnVOD);

  const vods = useMemo(() => {
    if (!data?.data?.vods || error || isFetching) return [];
    return data.data.vods;
  }, [data, error, isFetching]);

  return {
    vods,
    error,
    isFetching,
    refetch,
  };
}
