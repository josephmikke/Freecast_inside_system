import { useInfiniteQuery } from 'react-query';
import { useMemo } from 'react';
import { getVodsSeries } from '@api/vods';

function getSeriesByPage(
  nextToken: string,
  searchValue: string,
  categories?: string[],
  packages?: string[],
  platforms?: string[],
  providers?: string[],
  genres?: string[],
  active?: string,
) {
  return getVodsSeries(
    nextToken,
    searchValue,
    categories,
    packages,
    platforms,
    providers,
    genres,
    active,
  );
}

function useAllSeries({
  searchValue,
  categories = [],
  packages = [],
  platforms = [],
  providers = [],
  genres = [],
  active,
}: {
  searchValue: string;
  categories?: string[];
  packages?: string[];
  platforms?: string[];
  providers?: string[];
  genres?: string[];
  active?: string;
}) {
  const {
    data, isFetching, error, hasNextPage, fetchNextPage,
    refetch,
  } = useInfiniteQuery(
    ['pages', 'series', searchValue, categories, packages, platforms, providers, genres, active],
    ({ pageParam = '' }) => getSeriesByPage(pageParam, searchValue, categories, packages, platforms, providers, genres, active),
    {
      getNextPageParam: (lastPage) => lastPage.data.nextToken,
      keepPreviousData: true,
    },
  );

  const series = useMemo(() => {
    if (error || !data) return [];
    return data.pages
      .reduce((acc: any[], page: any) => [...acc, ...page.data.series], []);
  }, [isFetching, error, data]);

  return {
    series, isFetching, refetch, error, fetchNextPage, hasNextPage,
  };
}

export default useAllSeries;
