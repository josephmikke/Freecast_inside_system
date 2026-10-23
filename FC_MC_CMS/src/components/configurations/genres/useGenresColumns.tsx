import { Column, Row } from 'react-table';
import React, { useMemo } from 'react';
import TrashCell from '@components/commons/cells/TrashCell';
import DragCell from '@components/commons/cells/DragCell';
import CheckboxCell from '@components/commons/cells/CheckboxCell';
import { UseColumnProps } from '@components/configurations/useColumnProps';
import { GenreResult } from '@entities/configurations/genre';
import SimpleTextCell from '@components/commons/cells/SimpleTextCell';
import DoubleDateCell from '@components/commons/cells/DoubleDateCell';

export default function useGenresColumns({
  onClickTrash,
  onClickEnable,
}: UseColumnProps): Column<any>[] {
  return useMemo(
    () => [
      {
        Header: 'Drag',
        Cell: () => (<DragCell />),
        flex: 0.1,
      },
      {
        Header: 'Name',
        Cell: ({ row }: { row: Row<GenreResult> }) => (
          <SimpleTextCell text={row.original.name} />
        ),
        flex: 1,
      },
      {
        Header: 'Details',
        Cell: ({ row }: { row: Row<GenreResult> }) => (
          <SimpleTextCell text={`ID: ${row.original.extId}`} />
        ),
        flex: 1,
      },
      {
        Header: 'Dates',
        Cell: ({ row }: { row: Row<GenreResult> }) => (
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
        Cell: ({ row } : { row : Row<GenreResult> }) => (
          <CheckboxCell
            onChange={(checked) => onClickEnable(checked, row)}
            checked={row.original.enabled}
          />
        ),
        flex: 0.2,
      },
      {
        Header: 'Actions',
        Cell: ({ row }: { row: Row<GenreResult> }) => (
          <TrashCell onClick={(event) => onClickTrash(event, row)} entityName="Genre" />
        ),
        flex: 0.2,
      },
    ],
    [],
  );
}
