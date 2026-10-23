import { useInfiniteQuery } from 'react-query';
import { useEffect, useMemo } from 'react';
import { getChannels } from '@api/channels';

function getChannelsByPage(
  nextToken: string,
  searchValue: string,
  categories?: string[],
  packages?: string[],
  platforms?: string[],
  providers?: string[],
  active?: string,
) {
  return getChannels(nextToken, searchValue, categories, packages, platforms, providers, active);
}

function useAllChannels({
  searchValue,
  autoLoad = false,
  categories = [],
  packages = [],
  platforms = [],
  providers = [],
  active,
}: {
  searchValue: string;
  autoLoad?: boolean;
  categories?: string[];
  packages?: string[];
  platforms?: string[];
  providers?: string[];
  active?: string;
}) {
  const {
    data, isFetching, error, hasNextPage, fetchNextPage,
    refetch,
  } = useInfiniteQuery(
    ['pages', 'channels', searchValue, categories, packages, platforms, providers, active],
    ({ pageParam = '' }) => getChannelsByPage(pageParam, searchValue, categories, packages, platforms, providers, active),
    {
      getNextPageParam: (lastPage) => lastPage.data.nextToken,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    (async () => {
      if (hasNextPage && autoLoad) {
        await fetchNextPage();
      }
    })();
  }, [hasNextPage, isFetching]);

  const channels = useMemo(() => {
    if (error || !data) return [];
    return data.pages
      .reduce((acc: any[], page: any) => [...acc, ...page.data.channels], []);
  }, [isFetching, error, data]);

  return {
    channels, isFetching, refetch, error, fetchNextPage, hasNextPage,
  };
}

export default useAllChannels;
