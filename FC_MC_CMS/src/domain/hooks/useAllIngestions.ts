import { useInfiniteQuery } from 'react-query';
import { useMemo } from 'react';
import { getIngestions } from '@api/ingestions';

function getIngestionsByPage(nextToken: string) {
  return getIngestions(nextToken);
}

function useAllIngestions() {
  const {
    data, isFetching, error, hasNextPage, fetchNextPage,
    refetch,
  } = useInfiniteQuery(
    ['pages'],
    ({ pageParam = '' }) => getIngestionsByPage(pageParam),
    {
      getNextPageParam: (lastPage) => lastPage.data.nextToken,
      keepPreviousData: true,
    },
  );

  const ingestions = useMemo(() => {
    if (error || !data) return [];
    return data.pages
      .reduce((acc: any[], page: any) => [...acc, ...page.data.ingestions], []);
  }, [isFetching, error, data]);

  return {
    ingestions, isFetching, refetch, error, hasNextPage, fetchNextPage,
  };
}

export default useAllIngestions;
