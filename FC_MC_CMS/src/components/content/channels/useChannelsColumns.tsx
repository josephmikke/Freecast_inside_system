import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import MultiLineCell from '@components/commons/cells/MultiLineCell';
import TrashCell from '@components/commons/cells/TrashCell';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import MultiTagCell from '@components/commons/cells/MultiTagCell';
import CheckboxCell from '@components/commons/cells/CheckboxCell';
import { ChannelResult } from '@entities/content/channel';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import DoubleDateCell from '@components/commons/cells/DoubleDateCell';
import {
  filter,
  filterEnabled,
  filterProvider,
} from '@components/filtersAndSorters/filterFunction';

export default function useChannelsColumns({
  onClickTrash,
  onClickEnable,
}: UseColumnProps) : Column<any>[] {
  return useMemo(() => [
    {
      Header: 'Image',
      Cell: ({ row }: { row: Row<ChannelResult> }) => (
        <div className="max-h-[80px]">
          <img className="max-h-[80px] rounded-sm" src={row.original.thumbnail} alt={row.original.name} />
        </div>
      ),
      flex: 0.7,
    },
    {
      Header: 'Name',
      Cell: ({ row }: { row: Row<ChannelResult> }) => (
        <SimpleTextCell text={row.original.name} />
      ),
      accessor: 'name',
      flex: 1,
    },
    {
      Header: 'Details',
      Cell: ({ row }: { row: Row<ChannelResult> }) => (
        <MultiLineCell lines={[
          { label: 'Slug', value: row.original.slug },
          { label: 'ID', value: row.original.id },
          { label: 'LCN', value: String(row.original.lcn) },
        ]}
        />
      ),
      flex: 2,
    },
    {
      Header: 'Dates',
      Cell: ({ row }: { row: Row<ChannelResult> }) => (
        <DoubleDateCell
          firstLabelDate="Created"
          secondLabelDate="Updated"
          secondDate={row.original.updatedAt}
          firstDate={row.original.createdAt}
        />
      ),
      flex: 2,
    },
    {
      Header: 'Packages',
      Cell: ({ row }: { row: Row<ChannelResult> }) => (
        <MultiTagCell
          colored
          tags={row?.original?.packages.map((pkg: any) => pkg.label)}
          rounded="rounded-sm"
        />
      ),
      flex: 1,
    },
    {
      Header: 'Categories',
      Cell: ({ row }: { row: Row<ChannelResult> }) => (
        <MultiTagCell
          tags={row?.original?.categories?.map((cat: any) => cat.label) || []}
          rounded="rounded-sm"
        />
      ),
      flex: 1,
    },
    {
      Header: 'Checkbox',
      Cell: ({ row } : { row: Row<ChannelResult> }) => (
        <CheckboxCell
          onChange={(checked) => onClickEnable(checked, row)}
          checked={row.original.enabled}
        />
      ),
      accessor: 'enabled',
      id: 'enabled',
      filter: filterEnabled,
      flex: 0.3,
    },
    {
      Header: 'Actions',
      Cell: ({ row }: { row: Row<ChannelResult> }) => (
        <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="Channel" />
      ),
      flex: 0.3,
    },
    // sorting purpose
    { accessor: (row) => new Date(row.createdAt), sortType: 'basic', id: 'createdAt' },
    { accessor: (row) => new Date(row.updatedAt), sortType: 'basic', id: 'updatedAt' },
    { accessor: (row) => row.id, sortType: 'basic', id: 'id' },
    // filtering purpose
    { accessor: (row) => row.categories, filter: filter((category) => category.value), id: 'categories' },
    { accessor: (row) => row.packages, filter: filter((pkg) => pkg.value), id: 'packages' },
    { accessor: (row) => row.provider, filter: filterProvider, id: 'provider' },
    { accessor: (row) => row.platforms, filter: filter((platform) => platform.value), id: 'platforms' },
  ], []);
}
