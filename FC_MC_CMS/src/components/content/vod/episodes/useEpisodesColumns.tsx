import { Column, Row } from 'react-table';
import React, { useMemo } from 'react';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import DoubleDateCell from '@components/commons/cells/DoubleDateCell';
import TrashCell from '@components/commons/cells/TrashCell';

export default function useEpisodesColumns({
  onClickTrash,
}: UseColumnProps): Column<any>[] {
  return useMemo(() => [
    {
      Header: 'Image',
      Cell: ({ row }: { row: Row<any> }) => (
        <div className="max-h-[66px]">
          <img className="max-h-[66px]" src={row.original.thumbnail} alt={row.original.name} />
        </div>
      ),
      flex: 0.7,
    },
    {
      Header: 'Name',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={row.original.name} />
      ),
      flex: 1,
    },
    {
      Header: 'Number',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={`#${row.original.number}`} />
      ),
      flex: 0.3,
    },
    {
      Header: 'ID',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={`ID: ${row.original.id}`} />
      ),
      flex: 0.7,
    },
    {
      Header: 'Dates',
      Cell: ({ row }: { row: Row<any> }) => (
        <DoubleDateCell
          firstLabelDate="Available Date"
          secondLabelDate="Expiration Date"
          firstDate={row.original.availableDate}
          secondDate={row.original.expirationDate}
        />
      ),
      flex: 1,
    },
    {
      Header: 'Actions',
      Cell: ({ row }: { row: Row<any> }) => (
        <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="Episode" />
      ),
      flex: 0.3,
    },
  ], []);
}
