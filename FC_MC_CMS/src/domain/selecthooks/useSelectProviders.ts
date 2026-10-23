import { useMemo } from 'react';
import { Providers } from '@api/index';
import { ProviderResult } from '@entities/configurations/provider';

interface UseSelectProvidersReturn {
  providers: { label: string, value: string, weight: number }[];
  providersIsFetching: boolean;
}

export default function useSelectProviders(): UseSelectProvidersReturn {
  const {
    data: providersData,
    error: providersError,
    isFetching: providersIsFetching,
  } = Providers.useProviders();

  return useMemo<UseSelectProvidersReturn>(
    () => {
      if (!providersData?.data?.providers || providersError || providersIsFetching) {
        return { providers: [], providersIsFetching };
      }
      return {
        providers: providersData?.data?.providers
          ?.filter((provider: ProviderResult) => provider.enabled)
          ?.map((provider: ProviderResult) => ({
            label: provider.name, value: provider.id,
          })),
        providersIsFetching,
      };
    },
    [providersError, providersData, providersIsFetching],
  );
}
