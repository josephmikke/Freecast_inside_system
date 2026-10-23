import React, { useState } from 'react';
import Select from 'react-select';

export type OptionType = {
  label: string | undefined,
  value: string,
};

export type SortType = {
  [k: string]: { id: string, desc: boolean };
};

interface SortersProps {
  setSortBy: (sortOptions: { id: string, desc: boolean }[]) => void;
  sortsValue: SortType;
  options: OptionType[];
}

export default function Sorters({
  setSortBy,
  sortsValue,
  options,
}: SortersProps) {
  const [selectedSorter, setSelectedSorter] = useState<OptionType | null>();

  const onChange = (opt: OptionType | null) => {
    setSelectedSorter(opt);
    if (!opt) return;
    const sortOption = sortsValue[opt.value];
    setSortBy([sortOption]);
  };

  return (
    <Select<OptionType>
      isClearable
      styles={{
        placeholder: (styles) => ({
          ...styles,
          color: 'white',
        }),
        menuList: (styles: any) => ({
          ...styles,
          backgroundColor: '#949699 !important',
        }),
        control: (styles) => ({
          ...styles,
          border: 'none',
          backgroundColor: '#949699 !important',
          color: 'white !important',
        }),
        option: (styles) => ({
          ...styles,
          backgroundColor: '#949699 !important',
          border: 'none',
          color: 'white !important',
        }),
        singleValue: (styles) => ({
          ...styles,
          backgroundColor: '#949699 !important',
          color: 'white',
        }),
      }}
      placeholder="Sort By"
      value={selectedSorter}
      onChange={onChange}
      className="w-64"
      options={options}
    />
  );
}
