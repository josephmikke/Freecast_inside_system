import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Content, Nav } from '@components/index';
import CustomLoader from '@components/commons/CustomLoader';
import AddTopPageButton from '@components/commons/AddTopPageButton';
import { ChannelResult } from '@entities/content/channel';
import useAllChannels from '@/domain/hooks/useAllChannels';
import useSelectCategories from '@/domain/selecthooks/useSelectCategories';
import useSelectPackages from '@/domain/selecthooks/useSelectPackages';
import useSelectPlatforms from '@/domain/selecthooks/useSelectPlatforms';
import useSelectProviders from '@/domain/selecthooks/useSelectProviders';
import { mapChannelsToItems } from '@entities/content/mapChannel';
import useDebounce from '@utils/useDebounce';
import { OptionType } from '@components/filtersAndSorters/Sorters';
import {
  parseActiveQueryParam,
  parseQueryParams,
} from '@/utils/queryUtils';

function hasFilters(
  active?: string,
  categories?: OptionType[],
  packages?: OptionType[],
  platforms?: OptionType[],
  providers?: OptionType[],
  searchValue?: string,
) {
  return !!active
    || (categories && categories.length > 0)
    || (packages && packages.length > 0)
    || (platforms && platforms.length > 0)
    || (providers && providers.length > 0)
    || !!searchValue;
}

export default function ChannelsList() {
  const location = useLocation();
  const navigate = useNavigate();
  const getQueryParams = (query: string) => new URLSearchParams(query);

  const queryParams = getQueryParams(location.search);

  const [searchValue, setSearchValue] = useState<string>(queryParams.get('searchValue') || '');
  const debouncedSearchValue = useDebounce(searchValue, 500);

  const { categories, categoriesIsFetching } = useSelectCategories();
  const { platforms, platformsIsFetching } = useSelectPlatforms();
  const { packages, packagesIsFetching } = useSelectPackages();
  const { providers, providersIsFetching } = useSelectProviders();

  const [selectedCategories, setSelectedCategories] = useState<OptionType[] | undefined>(parseQueryParams(queryParams.get('categories') || '', categories || []));
  const [selectedPackages, setSelectedPackages] = useState<OptionType[] | undefined>(parseQueryParams(queryParams.get('packages') || '', packages || []));
  const [selectedPlatforms, setSelectedPlatforms] = useState<OptionType[] | undefined>(parseQueryParams(queryParams.get('platforms') || '', platforms || []));
  const [selectedProviders, setSelectedProviders] = useState<OptionType[] | undefined>(parseQueryParams(queryParams.get('providers') || '', providers || []));
  const [selectedActive, setSelectedActive] = useState<OptionType | undefined>(parseActiveQueryParam(queryParams.get('active')));

  const debouncedCategories = useDebounce(selectedCategories, 500);
  const debouncedPlatforms = useDebounce(selectedPlatforms, 500);
  const debouncedPackages = useDebounce(selectedPackages, 500);
  const debouncedProviders = useDebounce(selectedProviders, 500);

  const updateQueryParams = () => {
    const params = new URLSearchParams();
    if (debouncedSearchValue) params.set('searchValue', debouncedSearchValue);
    if (debouncedCategories && debouncedCategories.length) params.set('categories', debouncedCategories.map((cat) => cat.value).join(','));
    if (debouncedPlatforms && debouncedPlatforms.length) params.set('platforms', debouncedPlatforms.map((plat) => plat.value).join(','));
    if (debouncedPackages && debouncedPackages.length) params.set('packages', debouncedPackages.map((pack) => pack.value).join(','));
    if (debouncedProviders && debouncedProviders.length) params.set('providers', debouncedProviders.map((provider) => provider.value).join(','));
    if (selectedActive) params.set('active', selectedActive.value);

    navigate({ search: params.toString() });
  };

  useEffect(() => {
    if (!platformsIsFetching) {
      const platformsData = parseQueryParams(queryParams.get('platforms') || '', platforms || []);
      setSelectedPlatforms(platformsData);
    }
  }, [platforms, queryParams.get('platforms'), platformsIsFetching]);

  useEffect(() => {
    if (!categoriesIsFetching) {
      setSelectedCategories(parseQueryParams(queryParams.get('categories') || '', categories || []));
    }
  }, [categories, queryParams.get('categories'), categoriesIsFetching]);

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
    updateQueryParams();
  }, [
    debouncedSearchValue,
    debouncedCategories,
    debouncedPackages,
    debouncedPlatforms,
    debouncedProviders,
    selectedActive,
  ]);

  const filters = {
    searchValue: debouncedSearchValue,
    autoLoad: hasFilters(
      selectedActive?.value,
      debouncedCategories,
      debouncedPackages,
      debouncedPlatforms,
      debouncedProviders,
      debouncedSearchValue,
    ),
    categories: debouncedCategories ? debouncedCategories.map((cat) => cat.value) : [],
    packages: debouncedPackages ? debouncedPackages.map((pack) => pack.value) : [],
    platforms: debouncedPlatforms ? debouncedPlatforms.map((platform) => platform.value) : [],
    providers: debouncedProviders ? debouncedProviders.map((provider) => provider.value) : [],
    active: selectedActive?.value,
  };

  const {
    channels: data,
    error,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useAllChannels(filters);

  const loadMore = () => {
    if (hasNextPage) {
      fetchNextPage();
    }
  };

  // @ts-ignore
  const items: ChannelResult[] = useMemo(() => {
    if (!data || error) {
      return [];
    }
    return mapChannelsToItems(data);
  }, [data, error]);

  return (
    <Nav.Content
      title="Channels"
      desc="List of Channels."
    >
      <AddTopPageButton />
      <Content.ChannelsTable
        searchValue={searchValue}
        setSearchValue={setSearchValue}
        isFetching={isFetching}
        refetch={refetch}
        data={items}
        filters={{
          selectedActive,
          setSelectedActive,
          selectedCategories,
          setSelectedCategories,
          selectedPackages,
          setSelectedPackages,
          selectedPlatforms,
          setSelectedPlatforms,
          selectedProviders,
          setSelectedProviders,
        }}
      />
      {hasNextPage && !isFetching && (
        <div className="mt-4 w-full flex justify-center">
          <button className="bg-blue p-4 rounded-lg" type="button" onClick={loadMore}>Load more</button>
        </div>
      )}
      {isFetching && <CustomLoader />}
    </Nav.Content>
  );
}
