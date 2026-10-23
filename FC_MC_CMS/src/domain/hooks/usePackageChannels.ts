import { useMemo } from 'react';
import { Channels } from '@/api';

const excludeOnChannels = 'provider,epg,platforms,categories,packages,genres,locations,streams,distributors,brands';

export default function usePackageChannels(packageId: string) {
  const {
    data,
    error,
    isFetching,
    refetch,
  } = Channels.usePackageChannels(packageId, excludeOnChannels);

  const channels = useMemo(() => {
    if (!data?.data?.channels || error || isFetching) return [];
    return data.data.channels;
  }, [data, error, isFetching]);

  return {
    channels,
    error,
    isFetching,
    refetch,
  };
}
