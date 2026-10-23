import React from 'react';
import Sorters, { OptionType, SortType } from '@components/filtersAndSorters/Sorters';

interface VodSortersProps {
  setSortBy: (sortOptions: { id: string; desc: boolean }[]) => void;
}

const sortsValue: SortType = {
  'id desc': { id: 'id', desc: true },
  'id asc': { id: 'id', desc: false },
  'createdAt desc': { id: 'createdAt', desc: true },
  'createdAt asc': { id: 'createdAt', desc: false },
  'updatedAt desc': { id: 'updatedAt', desc: true },
  'updatedAt asc': { id: 'updatedAt', desc: false },
  'name desc': { id: 'name', desc: true },
  'name asc': { id: 'name', desc: false },
};

const options: OptionType[] = [
  { label: 'ID Desc', value: 'id asc' },
  { label: 'ID Asc ', value: 'id desc' },
  { label: 'Created Date Desc', value: 'createdAt asc' },
  { label: 'Created Date Asc', value: 'createdAt desc' },
  { label: 'Last Updated Desc', value: 'updatedAt asc' },
  { label: 'Last Updated Asc', value: 'updatedAt desc' },
  { label: 'Name A - Z', value: 'name asc' },
  { label: 'Name Z - A', value: 'name desc' },
];

export default function VodSorters({
  setSortBy,
}: VodSortersProps) {
  return (
    <Sorters
      setSortBy={setSortBy}
      sortsValue={sortsValue}
      options={options}
    />
  );
}
