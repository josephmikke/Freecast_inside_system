import { useInfiniteQuery } from 'react-query';
import { useEffect, useMemo } from 'react';
import { api } from '@api/misc';

const BASE_URL = 'logs';

const getLogs = async (
  limit?: number,
  nextToken?: string,
) => {
  const url = `${BASE_URL}?limit=${limit || 50}${nextToken ? `&nextToken=${nextToken}` : ''}`;
  return api.get(url);
};

const usePaginatedLogs = (
  pagination: { pageIndex: number, pageSize: number },
) => {
  const { pageIndex, pageSize } = pagination;
  const from = pageIndex * pageSize;
  const to = from + pageSize;

  const {
    data,
    isFetching,
    fetchNextPage,
    hasNextPage,
    refetch,
    error,
  } = useInfiniteQuery(
    ['logs'],
    ({ pageParam = '' }) => getLogs(pageSize, pageParam),
    {
      getNextPageParam: (lastPage) => lastPage.data.nextToken,
      keepPreviousData: true,
    },
  );

  const flatData = useMemo(() => data?.pages.flatMap((page) => page.data.logs) || [], [data]);

  useEffect(() => {
    if (flatData.length < to && hasNextPage) {
      fetchNextPage();
    }
  }, [flatData, pageIndex, pageSize]);

  const logs = flatData.slice(from, to);
  const count = flatData.length;

  return {
    logs,
    isFetching,
    count,
    hasNextPage,
    fetchNextPage,
    refetch,
    error,
  };
};

export {
  getLogs,
  usePaginatedLogs,
};
