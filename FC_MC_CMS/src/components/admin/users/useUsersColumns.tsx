import React, { useMemo } from 'react';
import { Column, Row } from 'react-table';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import CheckboxCell from '@components/commons/cells/CheckboxCell';
import TrashCell from '@components/commons/cells/TrashCell';
import DoubleDateCell from '@components/commons/cells/DoubleDateCell';

export default function useUsersColumns({
  onClickTrash,
  onClickEnable,
}: UseColumnProps): Column<any>[] {
  return useMemo(() => [
    {
      Header: 'Name',
      Cell: ({ row }: { row: Row<any> }) => (
        <SimpleTextCell text={row.original.name} />
      ),
      flex: 1,
      accessor: 'name',
      id: 'name',
    },
    {
      Header: 'Dates',
      Cell: ({ row }: { row: Row<any> }) => (
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
      Header: 'Checkbox',
      Cell: ({ row } : { row : Row<any> }) => (
        <CheckboxCell
          onChange={(checked) => onClickEnable(checked, row)}
          checked={row.original.enabled}
        />
      ),
      flex: 0.2,
    },
    {
      Header: 'Actions',
      Cell: ({ row }: { row: Row<any> }) => (
        <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="Category" />
      ),
      flex: 0.2,
    },
  ], []);
}
