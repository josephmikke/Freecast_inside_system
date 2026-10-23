import { useInfiniteQuery } from 'react-query';
import { useMemo } from 'react';
import { getVodsMovies } from '@api/vods';

function getMoviesByPage(
  nextToken: string,
  searchValue: string,
  categories?: string[],
  packages?: string[],
  platforms?: string[],
  providers?: string[],
  genres?: string[],
  active?: string,
) {
  return getVodsMovies(
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

function useAllMovies({
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
    ['pages', 'movies', searchValue, categories, packages, platforms, providers, genres, active],
    ({ pageParam = '' }) => getMoviesByPage(pageParam, searchValue, categories, packages, platforms, providers, genres, active),
    {
      getNextPageParam: (lastPage) => lastPage.data.nextToken,
      keepPreviousData: true,
    },
  );

  // useEffect(() => {
  //   (async () => {
  //     if (hasNextPage && autoLoad) {
  //       await fetchNextPage();
  //     }
  //   })();
  // }, [hasNextPage, isFetching]);

  const movies = useMemo(() => {
    if (error || !data) return [];
    return data.pages
      .reduce((acc: any[], page: any) => [...acc, ...page.data.movies], []);
  }, [isFetching, error, data, searchValue]);

  return {
    movies, isFetching, refetch, error, hasNextPage, fetchNextPage,
  };
}

export default useAllMovies;
