import { useEffect } from 'react';
import useAllMovies from '@/domain/hooks/useAllMovies';

function usePaginatedMovies({
  searchValue,
  categories = [],
  packages = [],
  platforms = [],
  providers = [],
  genres = [],
  active,
  pagination,
  sortBy,
}: {
  searchValue: string,
  categories?: string[];
  packages?: string[];
  platforms?: string[];
  providers?: string[];
  genres?: string[];
  active?: string;
  pagination: { pageIndex:number, pageSize:number }
  sortBy?: { id: string; desc: boolean }[];
}) {
  const {
    movies: fetchedMovies,
    isFetching,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useAllMovies({
    searchValue,
    categories,
    packages,
    platforms,
    providers,
    genres,
    active,
  });

  const { pageIndex, pageSize } = pagination;
  const from = pageIndex * pageSize;
  const to = from + pageSize;

  useEffect(() => {
    if (fetchedMovies.length < to && hasNextPage) {
      fetchNextPage();
    }
  }, [fetchedMovies, pageIndex, pageSize]);

  fetchedMovies.sort((a, b) => {
    if (!sortBy) return 0; // If sortBy is not provided, return 0

    // eslint-disable-next-line no-restricted-syntax
    for (const sortOption of sortBy) {
      const { id, desc } = sortOption;
      if (a[id] < b[id]) return desc ? 1 : -1;
      if (a[id] > b[id]) return desc ? -1 : 1;
    }
    return 0;
  });

  const movies = fetchedMovies.slice(from, to);
  const count = fetchedMovies.length;

  return {
    movies, count, isFetching, error, hasNextPage, fetchNextPage, refetch,
  };
}

export default usePaginatedMovies;
