import React from 'react';
import Sorters, { OptionType, SortType } from '@components/filtersAndSorters/Sorters';

interface LocationsSortersProps {
  setSortBy: (sortOptions: { id: string; desc: boolean }[]) => void;
}

const sortsValue: SortType = {
  'type desc': { id: 'type', desc: true },
  'type asc': { id: 'type', desc: false },
  'id desc': { id: 'id', desc: true },
  'id asc': { id: 'id', desc: false },
  'name desc': { id: 'name', desc: true },
  'name asc': { id: 'name', desc: false },
};

const options: OptionType[] = [
  { label: 'TYPE A - Z', value: 'type asc' },
  { label: 'TYPE Z - A', value: 'type desc' },
  { label: 'ID Desc', value: 'id asc' },
  { label: 'ID Asc ', value: 'id desc' },
  { label: 'Name A - Z', value: 'name asc' },
  { label: 'Name Z - A', value: 'name desc' },
];

export default function LocationsSorters({
  setSortBy,
}: LocationsSortersProps) {
  return (
    <Sorters
      setSortBy={setSortBy}
      sortsValue={sortsValue}
      options={options}
    />
  );
}
