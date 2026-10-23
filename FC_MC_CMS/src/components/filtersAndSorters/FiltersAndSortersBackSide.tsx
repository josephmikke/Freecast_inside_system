import React, { Dispatch, SetStateAction } from 'react';
import { OptionType } from '@components/filtersAndSorters/Sorters';

interface FiltersAndSortersProps {
  Sorter: any;
  Filter?: any;
  setSortBy: (args: any) => void;
  data: any;
  withSearch?: boolean;
  setSearchValue?: (value: string) => void;
  searchValue?: string;
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
    selectedGenres?: OptionType[] | undefined;
    setSelectedGenres?: Dispatch<SetStateAction<OptionType[] | undefined>>;
  }
}

export default function FiltersAndSortersBackSide({
  Sorter,
  Filter,
  setSortBy,
  withSearch,
  data,
  setSearchValue,
  searchValue,
  filters,
}: FiltersAndSortersProps) {
  const {
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
    selectedGenres,
    setSelectedGenres,
  } = filters;
  return (
    <div className="flex flex-row w-fit">
      {Filter && (
        <div className="mr-6">
          <Filter
            data={data}
            selectedActive={selectedActive}
            setSelectedActive={setSelectedActive}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            selectedPackages={selectedPackages}
            setSelectedPackages={setSelectedPackages}
            selectedPlatforms={selectedPlatforms}
            setSelectedPlatforms={setSelectedPlatforms}
            selectedProviders={selectedProviders}
            setSelectedProviders={setSelectedProviders}
            selectedGenres={selectedGenres}
            setSelectedGenres={setSelectedGenres}
          />
        </div>
      )}
      <Sorter setSortBy={setSortBy} />
      {withSearch && (
        <div className="ml-6 w-64 rounded-xl">
          <input
            onChange={(e) => setSearchValue?.(e.target.value)}
            type="text"
            value={searchValue}
            className="w-full px-3 h-[38px] !text-white bg-gray-light rounded placeholder-white"
            placeholder="Search..."
          />
        </div>
      )}
    </div>
  );
}
