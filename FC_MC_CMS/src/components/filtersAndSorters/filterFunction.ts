import { Row } from 'react-table';
import { ChannelResult } from '@entities/content/channel';

export function filter(getId: (arg: any) => any) {
  return function filterColumn(
    rows: Row<any>[],
    id: string,
    filterValues: string[],
  ) {
    if (!filterValues || !filterValues.length) {
      return rows;
    }

    return rows.filter((row: any) => row.original[id[0]]?.some((value: any) => {
      const ID = getId(value);
      return filterValues.some((_v) => _v === ID);
    }));
  };
}

export function filterEnabled(
  rows: Row<ChannelResult>[],
  id: string,
  filterValue: string,
) {
  if (!filterValue) return rows;

  return rows.filter((row) => row.original.enabled.toString() === filterValue);
}

export function filterProvider(
  rows: Row<ChannelResult>[],
  id: string,
  filterValue: string[],
) {
  if (!filterValue || !filterValue.length) return rows;

  return rows.filter(
    (row) => filterValue.some(
      (value: string) => !!row.original.provider && value === (row.original.provider as any).value,
    ),
  );
}

export function filterSearchByNameAndLCN(
  rows: Row<any>[],
  id: string,
  filterValue: string,
) {
  if (!filterValue) return rows;

  return rows.filter((row) => row.original.name.toLowerCase().includes(
    filterValue.trim().toLowerCase(),
  ) || String(row.original.lcn).startsWith(filterValue.trim().toLowerCase()));
}

export function filterSearchByName(
  rows: Row<any>[],
  id: string,
  filterValue: string,
) {
  if (!filterValue) return rows;

  return rows.filter((row) => row.original.name.toLowerCase().includes(
    filterValue.trim().toLowerCase(),
  ));
}
