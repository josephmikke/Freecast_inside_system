import { useInfiniteQuery } from 'react-query';
import { useEffect, useMemo } from 'react';
import { apiService } from '@api/misc';

function getBrandsByPage(url: string) {
  return apiService.get(url);
}

function useSelectBrands() {
  const {
    data, isFetching, error, hasNextPage, fetchNextPage,
  } = useInfiniteQuery(
    ['brands'],
    ({ pageParam = 'branding/api/v0/brands/?page=1&page_size=100' }) => getBrandsByPage(pageParam),
    {
      getNextPageParam: (lastPage) => lastPage.data.next,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    (async () => {
      if (hasNextPage) {
        await fetchNextPage();
      }
    })();
  }, [hasNextPage, isFetching]);

  return useMemo(() => {
    if (isFetching || error || !data?.pages?.length) return [];
    return data.pages
      .reduce((acc: any[], page: any) => [...acc, ...page.data.results], [])
      .map((brand: any) => ({ label: brand.name, value: brand.site_id }));
  }, [isFetching, error, data]);
}

export default useSelectBrands;
