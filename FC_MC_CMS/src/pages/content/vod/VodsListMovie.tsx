import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { OptionType } from '@components/filtersAndSorters/Sorters';
import { VodResult } from '@entities/content/vod';
import { mapVodsMoviesToItems } from '@entities/content/mapVod';
import AddTopPageButton from '@components/commons/AddTopPageButton';
import LoadAllButton from '@components/content/vod/buttons/LoadAllButton';
import StopButton from '@components/content/vod/buttons/StopButton';
import { Content } from '@/components';
import usePaginatedMovies from '@/domain/hooks/usePaginatedMovies';
import useSelectCategories from '@/domain/selecthooks/useSelectCategories';
import useSelectGenres from '@/domain/selecthooks/useSelectGenres';
import useSelectPackages from '@/domain/selecthooks/useSelectPackages';
import useSelectProviders from '@/domain/selecthooks/useSelectProviders';
import useSelectedPlatforms from '@/domain/selecthooks/useSelectPlatforms';
import useDebounce from '@utils/useDebounce';
import { Vods } from '@/api';
import {
  parseActiveQueryParam,
  parseQueryParams,
} from '@/utils/queryUtils';

export default function VodsListMovie() {
  const location = useLocation();
  const navigate = useNavigate();
  const getQueryParams = (query: string) => new URLSearchParams(query);

  // Initialize states from query parameters or default values
  const queryParams = getQueryParams(location.search);

  const { categories, categoriesIsFetching } = useSelectCategories();
  const { genres, genresIsFetching } = useSelectGenres();
  const { providers, providersIsFetching } = useSelectProviders();
  const { packages, packagesIsFetching } = useSelectPackages();
  const { platforms, platformsIsFetching } = useSelectedPlatforms();
  const [searchValue, setSearchValue] = useState<string>(queryParams.get('searchValue') || '');

  const [selectedActive, setSelectedActive] = useState<OptionType | undefined>(
    parseActiveQueryParam(queryParams.get('active')),
  );
  const [selectedCategories, setSelectedCategories] = useState<OptionType[] | undefined>(
    parseQueryParams(queryParams.get('categories') || '', categories || []),
  );
  const [selectedGenres, setSelectedGenres] = useState<OptionType[] | undefined>(
    parseQueryParams(queryParams.get('genres') || '', genres || []),
  );
  const [selectedPackages, setSelectedPackages] = useState<OptionType[] | undefined>(
    parseQueryParams(queryParams.get('packages') || '', packages || []),
  );
  const [selectedProviders, setSelectedProviders] = useState<OptionType[] | undefined>(
    parseQueryParams(queryParams.get('providers') || '', providers || []),
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<OptionType[] | undefined>(
    parseQueryParams(queryParams.get('platforms') || '', platforms || []),
  );

  const debouncedSearchValue = useDebounce<string>(searchValue, 500);
  const [pagination, setPagination] = useState<{ pageIndex: number, pageSize: number }>({ pageIndex: parseInt(queryParams.get('pageIndex') || '0', 10), pageSize: parseInt(queryParams.get('pageSize') || '10', 10) });

  const [sortBy, setSortBy] = useState<{ id: string; desc: boolean }[]>([]);

  const [isLoadAll, setLoadAll] = useState<boolean>(false);

  const debouncedCategories = useDebounce(selectedCategories, 500);
  const debouncedProviders = useDebounce(selectedProviders, 500);
  const debouncedPackages = useDebounce(selectedPackages, 500);
  const debouncedGenres = useDebounce(selectedGenres, 500);
  const debouncedPlatforms = useDebounce(selectedPlatforms, 500);

  const updateQueryParams = () => {
    const params = new URLSearchParams();

    // Include type=movies
    params.set('type', 'movies');

    if (searchValue) params.set('searchValue', searchValue);
    if (debouncedCategories && debouncedCategories.length) params.set('categories', debouncedCategories.map((cat) => cat.value).join(','));
    if (debouncedGenres && debouncedGenres.length) params.set('genres', debouncedGenres.map((gen) => gen.value).join(','));
    if (debouncedPackages && debouncedPackages.length) params.set('packages', debouncedPackages.map((pack) => pack.value).join(','));
    if (debouncedProviders && debouncedProviders.length) params.set('providers', debouncedProviders.map((provider) => provider.value).join(','));
    if (debouncedPlatforms && debouncedPlatforms.length) params.set('platforms', debouncedPlatforms.map((platform) => platform.value).join(','));
    if (selectedActive) params.set('active', selectedActive.value);
    if (pagination) {
      params.set('pageIndex', pagination.pageIndex.toString());
      params.set('pageSize', pagination.pageSize.toString());
    }
    navigate({ search: params.toString() });
  };

  useEffect(() => {
    if (!categoriesIsFetching) {
      setSelectedCategories(parseQueryParams(queryParams.get('categories') || '', categories || []));
    }
  }, [categories, queryParams.get('categories'), categoriesIsFetching]);

  useEffect(() => {
    if (!genresIsFetching) {
      setSelectedGenres(parseQueryParams(queryParams.get('genres') || '', genres || []));
    }
  }, [genres, queryParams.get('genres'), genresIsFetching]);

  useEffect(() => {
    if (!packagesIsFetching) {
      setSelectedPackages(parseQueryParams(queryParams.get('packages') || '', packages || []));
    }
  }, [packages, queryParams.get('packages'), packagesIsFetching]);

  useEffect(() => {
    if (!providersIsFetching) {
      setSelectedProviders(parseQueryParams(queryParams.get('providers') || '', providers || []));
    }
  }, [providers, queryParams.get('providers'), providersIsFetching]);

  useEffect(() => {
    if (!platformsIsFetching) {
      setSelectedPlatforms(parseQueryParams(queryParams.get('platforms') || '', platforms || []));
    }
  }, [platforms, queryParams.get('platforms'), platformsIsFetching]);

  useEffect(() => {
    updateQueryParams();
  }, [
    searchValue,
    selectedActive,
    debouncedCategories,
    debouncedGenres,
    debouncedPackages,
    debouncedProviders,
    selectedPlatforms,
    pagination,
    sortBy,
  ]);

  const filters = {
    searchValue: debouncedSearchValue,
    active: selectedActive?.value,
    categories: debouncedCategories ? debouncedCategories.map((cat) => cat.value) : [],
    genres: debouncedGenres ? debouncedGenres.map((gen) => gen.value) : [],
    packages: debouncedPackages ? debouncedPackages.map((pack) => pack.value) : [],
    providers: debouncedProviders ? debouncedProviders.map((prov) => prov.value) : [],
    platforms: debouncedPlatforms ? debouncedPlatforms.map((plat) => plat.value) : [],
    pagination,
    sortBy,
  };

  const {
    movies = [],
    count = 0,
    isFetching,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = usePaginatedMovies(filters);

  // @ts-ignore
  const itemsMovies: VodResult[] = useMemo(() => {
    if (error) {
      return [];
    }
    return mapVodsMoviesToItems(movies);
  }, [movies, error]);

  const loadMore = () => {
    if (hasNextPage) {
      fetchNextPage();
    }
  };

  useEffect(() => {
    if (isLoadAll && !isFetching) {
      loadMore();
    }
    if (!hasNextPage) {
      setLoadAll(false);
    }
  }, [isFetching, isLoadAll, hasNextPage]);

  const handleClickRow = (row: VodResult) => {
    navigate(`/content/vod/${row.id}/edit?type=movies`);
  };

  const handleClickEnable = async (row: VodResult, checked: boolean) => {
    await Vods.updateVodMovie(row.id, { enabled: checked });
    await refetch();
  };

  const handleClickTrash = async (row: VodResult) => {
    await Vods.deleteVodMovie(row.id);
    await refetch();
  };

  const isLoadingAll = isLoadAll;
  const isLoadedAll = !isLoadAll && !hasNextPage;
  const pageCount = useMemo(() => {
    if (hasNextPage) {
      return -1;
    }
    return Math.ceil(count / pagination.pageSize);
  }, [hasNextPage, count, pagination.pageSize]);

  return (
    <>
      {'Loaded items: '}
      {count}
      <LoadAllButton
        onClick={() => setLoadAll(true)}
        loading={isLoadingAll}
        disabled={isLoadingAll || isLoadedAll}
      />
      {(isLoadingAll && !isLoadedAll) && (
        <StopButton
          onClick={() => setLoadAll(false)}
        />
      )}
      <AddTopPageButton getLink={() => 'add?type=movies'} />

      <Content.VodTable
        data={itemsMovies}
        loading={isFetching}
        pageCount={pageCount}
        filters={{
          selectedActive,
          setSelectedActive,
          selectedGenres,
          setSelectedGenres,
          selectedCategories,
          setSelectedCategories,
          selectedPackages,
          setSelectedPackages,
          selectedProviders,
          setSelectedProviders,
          selectedPlatforms,
          setSelectedPlatforms,
        }}
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        onPaginationChange={setPagination}
        onSortChange={setSortBy}
        onClickRow={handleClickRow}
        onClickEnable={handleClickEnable}
        onClickTrash={handleClickTrash}
      />
    </>
  );
}
