import React, { Dispatch, SetStateAction } from 'react';
import useChannelsColumns from '@components/content/channels/useChannelsColumns';
import CustomTable from '@components/commons/tables/CustomTable';
import { Channels } from '@api/index';
import ChannelsSorters from '@components/content/channels/sortersAndFilters/ChannelsSorters';
import CustomLoader from '@components/commons/CustomLoader';
import FiltersAndSortersBackSide from '@components/filtersAndSorters/FiltersAndSortersBackSide';
import { OptionType } from '@components/filtersAndSorters/Sorters';
import ChannelsFiltersBackSide from './sortersAndFilters/ChannelsFiltersBackSide';

interface ChannelsTableProps {
  refetch: () => void;
  data: any[];
  isFetching?: boolean;
  searchValue: string;
  setSearchValue: (value: string) => void;
  filters: {
    selectedActive: OptionType | undefined;
    setSelectedActive: Dispatch<SetStateAction<OptionType | undefined>>;
    selectedCategories: OptionType[] | undefined;
    setSelectedCategories: Dispatch<SetStateAction<OptionType[] | undefined>>;
    selectedPackages: OptionType[] | undefined;
    setSelectedPackages: Dispatch<SetStateAction<OptionType[] | undefined>>;
    selectedPlatforms: OptionType[] | undefined;
    setSelectedPlatforms: Dispatch<SetStateAction<OptionType[] | undefined>>;
    selectedProviders: OptionType[] | undefined;
    setSelectedProviders: Dispatch<SetStateAction<OptionType[] | undefined>>;
  }
}

export default function ChannelsTable({
  refetch,
  data,
  isFetching,
  searchValue,
  setSearchValue,
  filters,
}: ChannelsTableProps) {
  return (
    <>
      {isFetching && (
        <div className="w-full pt-3 -mb-8 flex justify-end">
          <CustomLoader contained={false} size={30} />
        </div>
      )}
      <CustomTable
        refetch={refetch}
        data={data}
        filters={filters}
        useColumns={useChannelsColumns}
        getEditPath={(id: string) => `/content/channels/${id}/edit`}
        deleteEntity={Channels.deleteChannel}
        updateEntity={Channels.updateChannel}
        entityName="Channels"
        rowHeight={85}
        rowRounded="rounded-sm"
        FiltersSortersComponent={FiltersAndSortersBackSide}
        Sorter={ChannelsSorters}
        Filter={ChannelsFiltersBackSide}
        withSearch
        searchValue={searchValue}
        setSearchValue={setSearchValue}
      />
    </>
  );
}
