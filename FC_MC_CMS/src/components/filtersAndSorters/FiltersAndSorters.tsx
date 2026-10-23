import React from 'react';

interface FiltersAndSortersProps {
  Sorter: any;
  Filter?: any;
  setSortBy: (args: any) => void;
  setFilter: (columnId: string, filterValue: any) => void;
  data: any;
  withSearch?: boolean;
  setSearchValue?: (value: string) => void;
  searchValue?: string;
}

export default function FiltersAndSorters({
  Sorter,
  Filter,
  setFilter,
  setSortBy,
  withSearch,
  data,
  setSearchValue,
  searchValue,
}: FiltersAndSortersProps) {
  return (
    <div className="flex flex-row w-fit">
      {Filter && (
        <div className="mr-6">
          <Filter
            setFilter={setFilter}
            data={data}
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
