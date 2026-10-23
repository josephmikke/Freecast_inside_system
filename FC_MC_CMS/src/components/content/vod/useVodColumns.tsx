import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import { VodResult } from '@entities/content/vod';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import MultiLineCell from '@components/commons/cells/MultiLineCell';
import MultiTagCell from '@components/commons/cells/MultiTagCell';
import CheckboxCell from '@components/commons/cells/CheckboxCell';
import TrashCell from '@components/commons/cells/TrashCell';
import VodDateCell from '@components/commons/cells/VodDateCell';

export default function useVodColumns({
  onClickTrash,
  onClickEnable,
}: UseColumnProps): Column<any>[] {
  return useMemo(() => [
    {
      Header: 'Image',
      Cell: ({ row }: { row: Row<VodResult> }) => (
        <div className="max-h-[80px]">
          <img className="max-h-[80px] rounded-sm" src={row.original.thumbnail} alt={row.original.name} />
        </div>
      ),
      flex: 0.7,
    },
    {
      Header: 'Name',
      Cell: ({ row }: { row: Row<VodResult> }) => (
        <SimpleTextCell text={row.original.name} />
      ),
      flex: 2,
    },
    {
      Header: 'Details',
      Cell: ({ row }: { row: Row<VodResult> }) => (
        <MultiLineCell
          lines={[
            { label: 'ID', value: row.original.id },
            { label: 'Rating', value: String((row.original.rating as any).label) },
          ]}
          size="10px"
        />
      ),
      flex: 2,
    },
    {
      Header: 'Dates',
      Cell: ({ row }: { row: Row<VodResult> }) => (
        <VodDateCell
          firstLabelDate="Rotation"
          secondLabelDate="Updated"
          firstDate={row.original.availableDate}
          secondDate={row.original.updatedAt}
          thirdDate={row.original.expirationDate}
          showHover={false}
        />
      ),
      flex: 2,
    },
    {
      Header: 'Categories',
      Cell: ({ row }: { row: Row<VodResult> }) => (
        <MultiTagCell
          tags={row?.original?.categories?.map((cat: any) => cat.label) || []}
        />
      ),
      flex: 1,
    },
    {
      Header: 'Checkbox',
      Cell: ({ row } : { row: Row<VodResult> }) => (
        <CheckboxCell
          onChange={(checked) => onClickEnable(checked, row)}
          checked={row.original.enabled}
        />
      ),
      accessor: 'enabled',
      id: 'enabled',
      flex: 0.3,
    },
    {
      Header: 'Actions',
      Cell: ({ row }: { row: Row<VodResult> }) => (
        <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="VOD" />
      ),
      flex: 0.3,
    },
    // sorting purpose
    { accessor: (row) => new Date(row.createdAt), sortType: 'basic', id: 'createdAt' },
    { accessor: (row) => new Date(row.updatedAt), sortType: 'basic', id: 'updatedAt' },
    { accessor: (row) => row.id, sortType: 'basic', id: 'id' },
  ], []);
}
